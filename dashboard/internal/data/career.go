package data

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/santifer/career-ops/dashboard/internal/model"
)

var (
	reReportLink     = regexp.MustCompile(`\[(\d+)\]\(([^)]+)\)`)
	reScoreValue     = regexp.MustCompile(`(\d+\.?\d*)/5`)
	reArchetype      = regexp.MustCompile(`(?i)\*\*(?:Archetype|Arquetipo)(?:\s+detectado)?\*\*\s*\|\s*(.+)`)
	reTlDr           = regexp.MustCompile(`(?i)\*\*TL;DR\*\*\s*\|\s*(.+)`)
	reTlDrColon      = regexp.MustCompile(`(?i)\*\*TL;DR:\*\*\s*(.+)`)
	reRemote         = regexp.MustCompile(`(?i)\*\*Remote\*\*\s*\|\s*(.+)`)
	reComp           = regexp.MustCompile(`(?i)\*\*Comp\*\*\s*\|\s*(.+)`)
	reArchetypeColon = regexp.MustCompile(`(?i)\*\*(?:Archetype|Arquetipo):\*\*\s*(.+)`)
	reReportURL      = regexp.MustCompile(`(?m)^\*\*URL:\*\*\s*(https?://\S+)`)
	reBatchID        = regexp.MustCompile(`(?m)^\*\*Batch ID:\*\*\s*(\d+)`)

	statusRegistryOnce   sync.Once
	statusAliasToGroup   map[string]string
	statusGroupToRank    map[string]int
	statusGroupToDisplay map[string]int
	statusGroupToLabel   map[string]string
	statusGroupOrder     []string
	statusOptions        []string
	statusRegistryError  error
)

type trackerStatusRegistry struct {
	TrackerStatuses []trackerStatusEntry `json:"tracker_statuses"`
}

type trackerStatusEntry struct {
	Label        string   `json:"label"`
	Group        string   `json:"group"`
	Rank         int      `json:"rank"`
	DisplayOrder int      `json:"display_order"`
	Aliases      []string `json:"aliases"`
}

func initStatusRegistryDefaults() {
	if statusAliasToGroup != nil && statusGroupToRank != nil {
		return
	}

	statusAliasToGroup = make(map[string]string)
	statusGroupToLabel = map[string]string{
		"evaluated":         "EVALUATED",
		"applied":           "APPLIED",
		"response_received": "RESPONSE_RECEIVED",
		"interview":         "INTERVIEW",
		"offer":             "OFFER",
		"rejected":          "REJECTED",
		"discarded":         "DISCARDED",
		"skip":              "SKIP",
	}
	statusGroupToRank = map[string]int{
		"discarded":         0,
		"skip":              0,
		"rejected":          1,
		"evaluated":         2,
		"applied":           3,
		"response_received": 4,
		"interview":         5,
		"offer":             6,
	}
	statusGroupToDisplay = map[string]int{
		"interview":         0,
		"offer":             1,
		"response_received": 2,
		"applied":           3,
		"evaluated":         4,
		"skip":              5,
		"rejected":          6,
		"discarded":         7,
	}
	statusGroupOrder = []string{
		"interview",
		"offer",
		"response_received",
		"applied",
		"evaluated",
		"skip",
		"rejected",
		"discarded",
	}
	statusOptions = []string{
		"EVALUATED",
		"APPLIED",
		"RESPONSE_RECEIVED",
		"INTERVIEW",
		"OFFER",
		"REJECTED",
		"DISCARDED",
		"SKIP",
	}

	registerStatusAliases("evaluated", "EVALUATED", "evaluada", "degerlendirildi", "değerlendirildi", "condicional", "hold")
	registerStatusAliases("applied", "APPLIED", "aplicado", "enviada", "aplicada", "sent", "basvuruldu", "başvuruldu")
	registerStatusAliases("response_received", "RESPONSE_RECEIVED", "response received", "responded", "respondido", "contacted", "contacto", "geri donus alindi", "geri dönüş alındı")
	registerStatusAliases("interview", "INTERVIEW", "entrevista", "mulakat", "mülakat")
	registerStatusAliases("offer", "OFFER", "oferta", "teklif")
	registerStatusAliases("rejected", "REJECTED", "rechazado", "rechazada", "ret", "olumsuz")
	registerStatusAliases("discarded", "DISCARDED", "descartado", "descartada", "cerrada", "cancelada", "vazgecildi", "vazgeçildi", "duplicado", "dup")
	registerStatusAliases("skip", "SKIP", "no aplicar", "no_aplicar", "monitor", "uygun degil", "uygun değil", "geo blocker")
}

func registerStatusAliases(group string, values ...string) {
	for _, value := range values {
		statusAliasToGroup[foldStatus(value)] = group
	}
}

func loadStatusRegistry(careerOpsPath string) {
	statusRegistryOnce.Do(func() {
		initStatusRegistryDefaults()

		path := filepath.Join(careerOpsPath, "tracker-status-registry.json")
		content, err := os.ReadFile(path)
		if err != nil {
			statusRegistryError = err
			return
		}

		var registry trackerStatusRegistry
		if err := json.Unmarshal(content, &registry); err != nil {
			statusRegistryError = err
			return
		}

		aliasToGroup := make(map[string]string)
		groupToRank := make(map[string]int)
		groupToDisplay := make(map[string]int)
		groupToLabel := make(map[string]string)
		orderedStatuses := append([]trackerStatusEntry(nil), registry.TrackerStatuses...)
		sort.SliceStable(orderedStatuses, func(i, j int) bool {
			return orderedStatuses[i].DisplayOrder < orderedStatuses[j].DisplayOrder
		})
		options := make([]string, 0, len(orderedStatuses))
		groups := make([]string, 0, len(orderedStatuses))

		for _, status := range registry.TrackerStatuses {
			groupToRank[status.Group] = status.Rank
			groupToDisplay[status.Group] = status.DisplayOrder
			groupToLabel[status.Group] = status.Label
			aliasToGroup[foldStatus(status.Label)] = status.Group
			aliasToGroup[foldStatus(status.Group)] = status.Group
			for _, alias := range status.Aliases {
				aliasToGroup[foldStatus(alias)] = status.Group
			}
		}
		for _, status := range orderedStatuses {
			options = append(options, status.Label)
			groups = append(groups, status.Group)
		}

		if len(aliasToGroup) > 0 {
			statusAliasToGroup = aliasToGroup
		}
		if len(groupToRank) > 0 {
			statusGroupToRank = groupToRank
		}
		if len(groupToDisplay) > 0 {
			statusGroupToDisplay = groupToDisplay
		}
		if len(groupToLabel) > 0 {
			statusGroupToLabel = groupToLabel
		}
		if len(groups) > 0 {
			statusGroupOrder = groups
		}
		if len(options) > 0 {
			statusOptions = options
		}
	})
}

func foldStatus(raw string) string {
	replacer := strings.NewReplacer(
		"İ", "i",
		"I", "i",
		"ı", "i",
		"ğ", "g",
		"Ğ", "g",
		"ü", "u",
		"Ü", "u",
		"ş", "s",
		"Ş", "s",
		"ö", "o",
		"Ö", "o",
		"ç", "c",
		"Ç", "c",
	)
	s := replacer.Replace(raw)
	s = strings.ReplaceAll(s, "**", "")
	s = strings.TrimSpace(strings.ToLower(s))
	if idx := strings.Index(s, " 202"); idx > 0 {
		s = strings.TrimSpace(s[:idx])
	}
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func TrackerStatusOptions() []string {
	initStatusRegistryDefaults()
	return append([]string(nil), statusOptions...)
}

func TrackerStatusGroupOrder() []string {
	initStatusRegistryDefaults()
	return append([]string(nil), statusGroupOrder...)
}

func TrackerStatusLabel(group string) string {
	initStatusRegistryDefaults()
	if label, ok := statusGroupToLabel[group]; ok {
		return label
	}
	return strings.ToUpper(group)
}

// ParseApplications reads applications.md and returns parsed applications.
// It tries both {path}/applications.md and {path}/data/applications.md for compatibility.
func ParseApplications(careerOpsPath string) []model.CareerApplication {
	loadStatusRegistry(careerOpsPath)

	filePath := filepath.Join(careerOpsPath, "applications.md")
	content, err := os.ReadFile(filePath)
	if err != nil {
		// Fallback: try data/ subdirectory
		filePath = filepath.Join(careerOpsPath, "data", "applications.md")
		content, err = os.ReadFile(filePath)
		if err != nil {
			return nil
		}
	}

	lines := strings.Split(string(content), "\n")
	apps := make([]model.CareerApplication, 0)
	num := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "# ") || strings.HasPrefix(line, "|---") || strings.HasPrefix(line, "| #") {
			continue
		}
		if !strings.HasPrefix(line, "|") {
			continue
		}

		// Detect delimiter: if line contains tabs, use tab-aware splitting
		var fields []string
		if strings.Contains(line, "\t") {
			// Mixed format: starts with "| " then tab-separated
			line = strings.TrimPrefix(line, "|")
			line = strings.TrimSpace(line)
			parts := strings.Split(line, "\t")
			for _, p := range parts {
				fields = append(fields, strings.TrimSpace(strings.Trim(p, "|")))
			}
		} else {
			// Pure pipe format
			line = strings.Trim(line, "|")
			parts := strings.Split(line, "|")
			for _, p := range parts {
				fields = append(fields, strings.TrimSpace(p))
			}
		}

		if len(fields) < 8 {
			continue
		}

		num++
		app := model.CareerApplication{
			Number:  num,
			Date:    fields[1],
			Company: fields[2],
			Role:    fields[3],
			Status:  fields[5],
			HasPDF:  strings.Contains(fields[6], "\u2705"),
		}

		// Parse score (field 4 = Score column)
		app.ScoreRaw = fields[4]
		if sm := reScoreValue.FindStringSubmatch(fields[4]); sm != nil {
			app.Score, _ = strconv.ParseFloat(sm[1], 64)
		}

		// Parse report link
		if rm := reReportLink.FindStringSubmatch(fields[7]); rm != nil {
			app.ReportNumber = rm[1]
			app.ReportPath = rm[2]
		}

		// Notes (field 8 if exists)
		if len(fields) > 8 {
			app.Notes = fields[8]
		}

		apps = append(apps, app)
	}

	// Enrich with job URLs using 5-tier strategy:
	// 1. **URL:** field in report header (newest reports)
	// 2. **Batch ID:** in report -> batch-input.tsv URL lookup
	// 3. report_num -> batch-state completed mapping (legacy)
	// 4. scan-history.tsv (pipeline scan entries matched by company+role)
	// 5. company name fallback from batch-input.tsv
	batchURLs := loadBatchInputURLs(careerOpsPath)
	reportNumURLs := loadJobURLs(careerOpsPath)

	for i := range apps {
		if apps[i].ReportPath == "" {
			continue
		}
		fullReport := filepath.Join(careerOpsPath, apps[i].ReportPath)
		reportContent, err := os.ReadFile(fullReport)
		if err != nil {
			continue
		}
		header := string(reportContent)
		// Only scan the header (first 1000 bytes) for speed
		if len(header) > 1000 {
			header = header[:1000]
		}

		// Strategy 1: **URL:** in report
		if m := reReportURL.FindStringSubmatch(header); m != nil {
			apps[i].JobURL = m[1]
			continue
		}

		// Strategy 2: **Batch ID:** -> batch-input.tsv
		if m := reBatchID.FindStringSubmatch(header); m != nil {
			if url, ok := batchURLs[m[1]]; ok {
				apps[i].JobURL = url
				continue
			}
		}

		// Strategy 3: report_num -> batch-state completed mapping
		if reportNumURLs != nil {
			if url, ok := reportNumURLs[apps[i].ReportNumber]; ok {
				apps[i].JobURL = url
				continue
			}
		}
	}

	// Strategy 4: scan-history.tsv (pipeline scan entries matched by company+role)
	enrichFromScanHistory(careerOpsPath, apps)

	// Strategy 5: company name fallback from batch-input.tsv
	enrichAppURLsByCompany(careerOpsPath, apps)

	return apps
}

// loadBatchInputURLs reads batch-input.tsv and returns a map of batch ID -> job URL.
func loadBatchInputURLs(careerOpsPath string) map[string]string {
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return nil
	}
	result := make(map[string]string)
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		id := fields[0]
		notes := fields[3]
		// Extract real job URL from notes: "Title @ Company | Match% | https://actual-url"
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				result[id] = u
				continue
			}
		}
		// Fallback: use JackJill URL
		if strings.HasPrefix(fields[1], "http") {
			result[id] = fields[1]
		}
	}
	return result
}

// batchEntry holds parsed data from batch-input.tsv.
type batchEntry struct {
	id      string
	url     string
	company string
	role    string
}

// loadJobURLs reads batch TSV files and returns a map of report_num -> job URL.
// Uses two strategies: (1) report_num mapping for completed jobs, (2) company name
// matching as fallback for failed/missing jobs.
func loadJobURLs(careerOpsPath string) map[string]string {
	// Read batch-input.tsv: id \t url \t source \t notes
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return nil
	}

	// Parse batch-input: extract job URL, company, and role from notes
	entries := make(map[string]batchEntry) // keyed by id
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		e := batchEntry{id: fields[0]}
		notes := fields[3]

		// Extract URL from notes: "Title @ Company | Match% | https://actual-url"
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				e.url = u
			}
		}
		// Fallback: use JackJill URL from field 1
		if e.url == "" && strings.HasPrefix(fields[1], "http") {
			e.url = fields[1]
		}

		// Extract company and role: "Role @ Company | Match% | URL"
		notesPart := notes
		if pipeIdx := strings.Index(notesPart, " | "); pipeIdx >= 0 {
			notesPart = notesPart[:pipeIdx]
		}
		if atIdx := strings.LastIndex(notesPart, " @ "); atIdx >= 0 {
			e.role = strings.TrimSpace(notesPart[:atIdx])
			e.company = strings.TrimSpace(notesPart[atIdx+3:])
		}

		if e.url != "" {
			entries[fields[0]] = e
		}
	}

	// Read batch-state.tsv: id \t url \t status \t ... \t report_num \t ...
	statePath := filepath.Join(careerOpsPath, "batch", "batch-state.tsv")
	stateData, err := os.ReadFile(statePath)
	if err != nil {
		return nil
	}

	// Strategy 1: map report_num -> URL only for COMPLETED jobs
	reportToURL := make(map[string]string)
	for _, line := range strings.Split(string(stateData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 6 || fields[0] == "id" {
			continue
		}
		id := fields[0]
		status := fields[2]
		reportNum := fields[5]
		if status != "completed" || reportNum == "" || reportNum == "-" {
			continue
		}
		if e, ok := entries[id]; ok {
			reportToURL[reportNum] = e.url
			if len(reportNum) < 3 {
				reportToURL[fmt.Sprintf("%03s", reportNum)] = e.url
			}
		}
	}

	return reportToURL
}

// enrichFromScanHistory fills JobURL from scan-history.tsv by matching company name.
func enrichFromScanHistory(careerOpsPath string, apps []model.CareerApplication) {
	scanPath := filepath.Join(careerOpsPath, "scan-history.tsv")
	scanData, err := os.ReadFile(scanPath)
	if err != nil {
		return
	}

	// Build company -> URL index from scan-history
	type scanEntry struct {
		url     string
		company string
		title   string
	}
	byCompany := make(map[string][]scanEntry)
	for _, line := range strings.Split(string(scanData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 5 || fields[0] == "url" {
			continue
		}
		url := fields[0]
		company := fields[4]
		title := fields[3]
		if url == "" || !strings.HasPrefix(url, "http") {
			continue
		}
		key := normalizeCompany(company)
		byCompany[key] = append(byCompany[key], scanEntry{url: url, company: company, title: title})
	}

	for i := range apps {
		if apps[i].JobURL != "" {
			continue
		}
		key := normalizeCompany(apps[i].Company)
		matches := byCompany[key]
		if len(matches) == 1 {
			apps[i].JobURL = matches[0].url
		} else if len(matches) > 1 {
			// Multiple entries: pick best role match
			appRole := strings.ToLower(apps[i].Role)
			best := matches[0].url
			bestScore := 0
			for _, m := range matches {
				score := 0
				mTitle := strings.ToLower(m.title)
				for _, word := range strings.Fields(appRole) {
					if len(word) > 2 && strings.Contains(mTitle, word) {
						score++
					}
				}
				if score > bestScore {
					bestScore = score
					best = m.url
				}
			}
			apps[i].JobURL = best
		}
	}
}

// normalizeCompany folds Turkish characters and trims common local legal suffixes.
func normalizeCompany(name string) string {
	replacer := strings.NewReplacer(
		"İ", "i",
		"I", "i",
		"ı", "i",
		"ğ", "g",
		"Ğ", "g",
		"ü", "u",
		"Ü", "u",
		"ş", "s",
		"Ş", "s",
		"ö", "o",
		"Ö", "o",
		"ç", "c",
		"Ç", "c",
		"&", " and ",
		".", " ",
		",", " ",
		"(", " ",
		")", " ",
		"/", " ",
		"-", " ",
		"'", " ",
		"’", " ",
	)
	s := strings.ToLower(strings.TrimSpace(replacer.Replace(name)))
	tokens := strings.Fields(s)
	suffixTokens := map[string]bool{
		"a": true, "s": true, "as": true, "anonim": true,
		"limited": true, "ltd": true, "sti": true,
		"sirket": true, "sirketi": true, "san": true,
		"ve": true, "tic": true,
	}
	for len(tokens) > 0 && suffixTokens[tokens[len(tokens)-1]] {
		tokens = tokens[:len(tokens)-1]
	}
	return strings.Join(tokens, "")
}

// enrichAppURLsByCompany fills in JobURL for apps that didn't get one via report_num mapping.
// It matches by company name from batch-input.tsv notes.
func enrichAppURLsByCompany(careerOpsPath string, apps []model.CareerApplication) {
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return
	}

	// Build company -> []entry index
	type entry struct {
		role string
		url  string
	}
	byCompany := make(map[string][]entry)
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		notes := fields[3]
		var url string
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				url = u
			}
		}
		if url == "" && strings.HasPrefix(fields[1], "http") {
			url = fields[1]
		}
		if url == "" {
			continue
		}
		notesPart := notes
		if pipeIdx := strings.Index(notesPart, " | "); pipeIdx >= 0 {
			notesPart = notesPart[:pipeIdx]
		}
		if atIdx := strings.LastIndex(notesPart, " @ "); atIdx >= 0 {
			role := strings.TrimSpace(notesPart[:atIdx])
			company := strings.TrimSpace(notesPart[atIdx+3:])
			key := normalizeCompany(company)
			byCompany[key] = append(byCompany[key], entry{role: role, url: url})
		}
	}

	for i := range apps {
		if apps[i].JobURL != "" {
			continue
		}
		key := normalizeCompany(apps[i].Company)
		matches := byCompany[key]
		if len(matches) == 1 {
			apps[i].JobURL = matches[0].url
		} else if len(matches) > 1 {
			// Multiple entries for same company: pick best role match
			appRole := strings.ToLower(apps[i].Role)
			best := matches[0].url
			bestScore := 0
			for _, m := range matches {
				score := 0
				mRole := strings.ToLower(m.role)
				// Count matching words
				for _, word := range strings.Fields(appRole) {
					if len(word) > 2 && strings.Contains(mRole, word) {
						score++
					}
				}
				if score > bestScore {
					bestScore = score
					best = m.url
				}
			}
			apps[i].JobURL = best
		}
	}
}

// ComputeMetrics calculates aggregate metrics from applications.
func ComputeMetrics(apps []model.CareerApplication) model.PipelineMetrics {
	m := model.PipelineMetrics{
		Total:    len(apps),
		ByStatus: make(map[string]int),
	}

	var totalScore float64
	var scored int

	for _, app := range apps {
		status := NormalizeStatus(app.Status)
		m.ByStatus[status]++

		if app.Score > 0 {
			totalScore += app.Score
			scored++
			if app.Score > m.TopScore {
				m.TopScore = app.Score
			}
		}
		if app.HasPDF {
			m.WithPDF++
		}
		if status != "skip" && status != "rejected" && status != "discarded" {
			m.Actionable++
		}
	}

	if scored > 0 {
		m.AvgScore = totalScore / float64(scored)
	}

	return m
}

// NormalizeStatus normalizes raw status text to an internal dashboard group.
// Aliases mirror tracker-status-registry.json.
func NormalizeStatus(raw string) string {
	initStatusRegistryDefaults()
	s := foldStatus(raw)
	if s == "" {
		return "discarded"
	}
	if strings.HasPrefix(s, "duplicado") || strings.HasPrefix(s, "dup") || strings.HasPrefix(s, "repost") {
		return "discarded"
	}
	if group, ok := statusAliasToGroup[s]; ok {
		return group
	}
	return s
}

// LoadReportSummary extracts key fields from a report file.
func LoadReportSummary(careerOpsPath, reportPath string) (archetype, tldr, remote, comp string) {
	fullPath := filepath.Join(careerOpsPath, reportPath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return
	}
	text := string(content)

	if m := reArchetype.FindStringSubmatch(text); m != nil {
		archetype = cleanTableCell(m[1])
	} else if m := reArchetypeColon.FindStringSubmatch(text); m != nil {
		archetype = cleanTableCell(m[1])
	}

	// Try table-format TL;DR first (most reports), then colon format
	if m := reTlDr.FindStringSubmatch(text); m != nil {
		tldr = cleanTableCell(m[1])
	} else if m := reTlDrColon.FindStringSubmatch(text); m != nil {
		tldr = cleanTableCell(m[1])
	}

	if m := reRemote.FindStringSubmatch(text); m != nil {
		remote = cleanTableCell(m[1])
	}

	if m := reComp.FindStringSubmatch(text); m != nil {
		comp = cleanTableCell(m[1])
	}

	// Truncate long fields
	if len(tldr) > 120 {
		tldr = tldr[:117] + "..."
	}

	return
}

// UpdateApplicationStatus updates the status of an application in applications.md.
func UpdateApplicationStatus(careerOpsPath string, app model.CareerApplication, newStatus string) error {
	filePath := filepath.Join(careerOpsPath, "applications.md")
	content, err := os.ReadFile(filePath)
	if err != nil {
		filePath = filepath.Join(careerOpsPath, "data", "applications.md")
		content, err = os.ReadFile(filePath)
		if err != nil {
			return err
		}
	}

	lines := strings.Split(string(content), "\n")
	found := false

	for i, line := range lines {
		if !strings.HasPrefix(strings.TrimSpace(line), "|") {
			continue
		}
		// Match by report number
		if app.ReportNumber != "" && strings.Contains(line, fmt.Sprintf("[%s]", app.ReportNumber)) {
			updatedLine, ok := replaceStatusInLine(line, newStatus)
			if !ok {
				return fmt.Errorf("could not parse tracker row for report %s", app.ReportNumber)
			}
			lines[i] = updatedLine
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("application not found: report %s", app.ReportNumber)
	}

	return os.WriteFile(filePath, []byte(strings.Join(lines, "\n")), 0644)
}

// replaceStatusInLine replaces only the status column in a markdown table line.
func replaceStatusInLine(line, newStatus string) (string, bool) {
	parts := strings.Split(line, "|")
	if len(parts) < 10 {
		return "", false
	}
	parts[6] = " " + newStatus + " "
	return strings.Join(parts, "|"), true
}

// cleanTableCell removes trailing pipes and whitespace from a table cell value.
func cleanTableCell(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimRight(s, "|")
	return strings.TrimSpace(s)
}

// StatusPriority returns the sort priority for a status (lower = higher priority).
func StatusPriority(status string) int {
	initStatusRegistryDefaults()

	norm := NormalizeStatus(status)
	order, ok := statusGroupToDisplay[norm]
	if !ok {
		return len(statusGroupToDisplay) + 1
	}
	return order
}
