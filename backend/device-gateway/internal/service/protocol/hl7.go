package protocol

import (
	"strings"
)

// ParsedResult holds fields extracted from an HL7 ORU^R01 or ASTM result message.
type ParsedResult struct {
	AccessionID string
	PatientName string
	TestCode    string
	Value       string
	Unit        string
}

// ParseHL7 extracts the first result from an HL7 v2 ORU^R01 message.
// Handles MLLP-unwrapped content (raw HL7 segments separated by \r or \n).
func ParseHL7(raw string) (*ParsedResult, error) {
	result := &ParsedResult{}
	lines := strings.Split(strings.NewReplacer("\r\n", "\n", "\r", "\n").Replace(raw), "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) < 3 {
			continue
		}
		seg := line[:3]
		fields := strings.Split(line, "|")

		switch seg {
		case "PID":
			// PID-3: patient identifier list — accession stored here by some analyzers
			if len(fields) > 3 && fields[3] != "" {
				idField := strings.Split(fields[3], "^")
				result.AccessionID = idField[0]
			}
			// PID-5: patient name (family^given)
			if len(fields) > 5 {
				parts := strings.Split(fields[5], "^")
				if len(parts) >= 2 {
					result.PatientName = parts[1] + " " + parts[0]
				} else {
					result.PatientName = parts[0]
				}
			}
		case "OBR":
			// OBR-3: filler order number = accession number (preferred source)
			if len(fields) > 3 && fields[3] != "" {
				result.AccessionID = fields[3]
			}
		case "OBX":
			// First OBX only — subsequent OBX segments are additional analytes
			if result.TestCode != "" {
				continue
			}
			// OBX-3: observation identifier (LOINC or local code ^ description)
			if len(fields) > 3 {
				codeParts := strings.Split(fields[3], "^")
				result.TestCode = codeParts[0]
			}
			// OBX-5: observation value
			if len(fields) > 5 {
				result.Value = fields[5]
			}
			// OBX-6: units
			if len(fields) > 6 && fields[6] != "" {
				unitParts := strings.Split(fields[6], "^")
				result.Unit = unitParts[0]
			}
		}
	}
	return result, nil
}

// FormatHL7Worklist builds a minimal HL7 OML^O21 worklist query for one accession.
// The analyzer sends back an ORU^R01 result when it processes the test.
func FormatHL7Worklist(accessionNumber, testCode, testName, specimenType, patientID string) string {
	var sb strings.Builder
	sb.WriteString("MSH|^~\\&|DiagDesk|LAB|Analyzer|LAB|||OML^O21^OML_O21||P|2.5.1\r")
	sb.WriteString("PID|1||" + patientID + "^^^LAB\r")
	sb.WriteString("ORC|NW|" + accessionNumber + "\r")
	sb.WriteString("OBR|1|" + accessionNumber + "||" + testCode + "^" + testName + "|||||||||||" + specimenType + "\r")
	return "\x0b" + sb.String() + "\x1c\r"
}
