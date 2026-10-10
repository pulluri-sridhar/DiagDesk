{{/*
Common labels applied to every resource in this chart.
*/}}
{{- define "diagdesk.labels" -}}
app.kubernetes.io/part-of: diagdesk
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
diagdesk/deployment-tier: branch
{{- end }}

{{/*
Selector labels — stable subset used in matchLabels (must not change after deploy).
*/}}
{{- define "diagdesk.selectorLabels" -}}
app.kubernetes.io/part-of: diagdesk
diagdesk/deployment-tier: branch
{{- end }}

{{/*
Standard environment block injected into every Java service container.
Secrets (DB_USER / DB_PASSWORD) are sourced from the diagdesk-db secret;
the rest come from the shared configmap.
*/}}
{{- define "diagdesk.dbSecretEnv" -}}
- name: DB_USER
  valueFrom:
    secretKeyRef:
      name: diagdesk-db-secret
      key: username
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: diagdesk-db-secret
      key: password
{{- end }}
