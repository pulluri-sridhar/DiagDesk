// Supabase Edge Function: parse-invoice
// Accepts a base64-encoded PDF or image invoice and extracts item names + quantities
// using the Anthropic Claude API.
// Deploy: supabase functions deploy parse-invoice
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  file_base64: string;
  file_type: string;  // e.g. "image/jpeg", "image/png", "application/pdf"
}

interface ParsedLineItem {
  name: string;
  quantity: number;
  unit?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Supabase secrets. Run: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json() as InvoiceRequest;
    const { file_base64, file_type } = body;

    if (!file_base64 || !file_type) {
      return new Response(
        JSON.stringify({ error: 'Missing file_base64 or file_type' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const isImage = file_type.startsWith('image/');
    const isPDF   = file_type === 'application/pdf';

    if (!isImage && !isPDF) {
      return new Response(
        JSON.stringify({ error: `Unsupported file type "${file_type}". Only images and PDFs are supported.` }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const PROMPT = `You are a data-extraction assistant for a diagnostic laboratory inventory system.
This document is a supplier invoice or goods receipt note (GRN).
Extract every product/item line and return a JSON array.
Each object must have:
  "name"     – the product name exactly as printed (string)
  "quantity" – the numeric quantity (number, no units)
  "unit"     – the unit of measure if present (string, optional)
Exclude header rows, totals, taxes, shipping charges, and any non-product rows.
Output ONLY the JSON array with no markdown, no explanation.
Example: [{"name":"CBC Reagent Kit","quantity":5,"unit":"kits"},{"name":"Haematology Control","quantity":2}]`;

    const userContent =
      isImage
        ? [
            { type: 'image', source: { type: 'base64', media_type: file_type, data: file_base64 } },
            { type: 'text', text: PROMPT },
          ]
        : [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file_base64 } },
            { type: 'text', text: PROMPT },
          ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    if (isPDF) headers['anthropic-beta'] = 'pdfs-2024-09-25';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API ${anthropicRes.status}: ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData?.content?.[0]?.text ?? '[]';

    let items: ParsedLineItem[] = [];
    try {
      items = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) items = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
