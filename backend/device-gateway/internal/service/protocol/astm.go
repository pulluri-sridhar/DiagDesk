package protocol

import (
	"strings"
)

// ParseASTM extracts result fields from an ASTM E1394 message.
// Records are separated by \r; each starts with a single-character record type.
func ParseASTM(raw string) (*ParsedResult, error) {
	result := &ParsedResult{}
	records := strings.Split(strings.ReplaceAll(raw, "\r\n", "\r"), "\r")

	for _, rec := range records {
		if len(rec) < 2 {
			continue
		}
		recType := string(rec[0])
		fields := strings.Split(rec, "|")

		switch recType {
		case "P": // Patient record — field 5 is patient name
			if len(fields) > 5 {
				result.PatientName = fields[5]
			}
		case "O": // Order record — field 3 is specimen/accession ID
			if len(fields) > 3 {
				// Strip surrounding ^ delimiters some analyzers add
				result.AccessionID = strings.Trim(strings.Split(fields[3], "^")[0], " ")
			}
		case "R": // Result record
			if result.TestCode != "" {
				continue // first R record only
			}
			// Field 2: universal test ID  ^^^<local_code>^<name>
			if len(fields) > 2 {
				codeParts := strings.Split(fields[2], "^")
				for _, p := range codeParts {
					if p != "" {
						result.TestCode = p
						break
					}
				}
			}
			if len(fields) > 3 {
				result.Value = fields[3]
			}
			if len(fields) > 4 {
				result.Unit = fields[4]
			}
		}
	}
	return result, nil
}

// FormatASTMWorklist builds a minimal ASTM E1394 order record for one accession.
func FormatASTMWorklist(accessionNumber, testCode, patientName string) string {
	var sb strings.Builder
	sb.WriteString("H|\\^&|||DiagDesk|||||||P|1\r")
	sb.WriteString("P|1|||" + accessionNumber + "||" + patientName + "\r")
	sb.WriteString("O|1|" + accessionNumber + "|" + accessionNumber + "|^^^" + testCode + "\r")
	sb.WriteString("L|1|N\r")
	return sb.String()
}
