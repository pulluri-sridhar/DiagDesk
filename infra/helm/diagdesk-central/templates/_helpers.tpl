{{/*
Common labels applied to every resource in this chart.
*/}}
{{- define "diagdesk-central.labels" -}}
app.kubernetes.io/part-of: diagdesk
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
diagdesk/deployment-tier: central
{{- end }}
