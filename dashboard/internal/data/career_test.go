package data

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseApplicationsMergesTurkeySidecarBeforeFallbacks(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "data"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "reports"), 0755); err != nil {
		t.Fatal(err)
	}

	applications := `| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-14 | Acme | Backend Engineer | 4.3/5 | EVALUATED | ✅ | [001](reports/001-acme.md) | city:izmir work_model:remote lang:en salary:transparent source:kariyer_net confidence:0.80 |
`
	if err := os.WriteFile(filepath.Join(root, "data", "applications.md"), []byte(applications), 0644); err != nil {
		t.Fatal(err)
	}

	report := `# Degerlendirme: Acme -- Backend Engineer

**Date:** 2026-04-14
**URL:** https://www.kariyer.net/is-ilani/acme-backend?utm_source=test
**City:** ankara
**Work Model:** on_site
**Language:** tr
**Salary Transparency:** opaque
**Source:** report_source
**Confidence:** high
`
	if err := os.WriteFile(filepath.Join(root, "reports", "001-acme.md"), []byte(report), 0644); err != nil {
		t.Fatal(err)
	}

	sidecar := `{"canonical_url":"https://www.kariyer.net/is-ilani/acme-backend","url":"https://www.kariyer.net/is-ilani/acme-backend?utm_source=test","city":"istanbul","work_model":"hybrid","language":"tr_en","employment_type":"full_time","salary_transparency":"market_range","source":"Kariyer.net","confidence_score":0.72}
`
	if err := os.WriteFile(filepath.Join(root, "data", "tr-listings.jsonl"), []byte(sidecar), 0644); err != nil {
		t.Fatal(err)
	}

	apps := ParseApplications(root)
	if len(apps) != 1 {
		t.Fatalf("expected 1 app, got %d", len(apps))
	}
	app := apps[0]
	if app.JobURL != "https://www.kariyer.net/is-ilani/acme-backend?utm_source=test" {
		t.Fatalf("unexpected job URL: %q", app.JobURL)
	}
	if app.City != "istanbul" || app.WorkModel != "hybrid" || app.Language != "tr_en" {
		t.Fatalf("expected sidecar metadata to win, got city=%q work=%q lang=%q", app.City, app.WorkModel, app.Language)
	}
	if app.EmploymentType != "full_time" {
		t.Fatalf("expected employment type from sidecar, got %q", app.EmploymentType)
	}
	if app.SalaryTransparency != "market_range" || app.SalaryTransparent {
		t.Fatalf("unexpected salary metadata: %q transparent=%v", app.SalaryTransparency, app.SalaryTransparent)
	}
	if app.Source != "Kariyer.net" || app.ConfidenceScore != 0.72 {
		t.Fatalf("unexpected source/confidence: %q %.2f", app.Source, app.ConfidenceScore)
	}
}

func TestParseApplicationsReadsColonStyleReportMetadata(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "data"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "reports"), 0755); err != nil {
		t.Fatal(err)
	}

	applications := `| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-14 | Beta | Platform Engineer | 4.0/5 | EVALUATED | ❌ | [002](reports/002-beta.md) |  |
`
	if err := os.WriteFile(filepath.Join(root, "data", "applications.md"), []byte(applications), 0644); err != nil {
		t.Fatal(err)
	}

	report := `# Degerlendirme: Beta -- Platform Engineer

**Date:** 2026-04-14
**URL:** https://www.eleman.net/is-ilani/platform-engineer-i123
**City:** istanbul
**Work Model:** remote
**Language:** en
**Employment Type:** full_time
**Salary Transparency:** transparent
**Source:** Eleman.net
**Confidence:** medium
`
	if err := os.WriteFile(filepath.Join(root, "reports", "002-beta.md"), []byte(report), 0644); err != nil {
		t.Fatal(err)
	}

	apps := ParseApplications(root)
	if len(apps) != 1 {
		t.Fatalf("expected 1 app, got %d", len(apps))
	}
	app := apps[0]
	if app.City != "istanbul" || app.WorkModel != "remote" || app.Language != "en" {
		t.Fatalf("expected colon-style report metadata, got city=%q work=%q lang=%q", app.City, app.WorkModel, app.Language)
	}
	if app.EmploymentType != "full_time" || !app.SalaryTransparent || app.Source != "Eleman.net" || app.Confidence != "medium" {
		t.Fatalf("unexpected report metadata: employment=%q salary=%q transparent=%v source=%q confidence=%q", app.EmploymentType, app.SalaryTransparency, app.SalaryTransparent, app.Source, app.Confidence)
	}
}

func TestParseApplicationsPrefersNoteTagsOverReportMetadata(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "data"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "reports"), 0755); err != nil {
		t.Fatal(err)
	}

	applications := `| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-14 | Gamma | QA Engineer | 3.9/5 | EVALUATED | ❌ | [003](reports/003-gamma.md) | city:izmir work_model:hybrid lang:tr_en salary:transparent source:tag_source confidence:0.50 |
`
	if err := os.WriteFile(filepath.Join(root, "data", "applications.md"), []byte(applications), 0644); err != nil {
		t.Fatal(err)
	}

	report := `# Degerlendirme: Gamma -- QA Engineer

**Date:** 2026-04-14
**URL:** https://www.secretcv.com/is-ilanlari/qa-engineer-is-ilani-123
**City:** ankara
**Work Model:** on_site
**Language:** tr
**Salary Transparency:** opaque
**Source:** report_source
**Confidence:** high
`
	if err := os.WriteFile(filepath.Join(root, "reports", "003-gamma.md"), []byte(report), 0644); err != nil {
		t.Fatal(err)
	}

	apps := ParseApplications(root)
	if len(apps) != 1 {
		t.Fatalf("expected 1 app, got %d", len(apps))
	}
	app := apps[0]
	if app.City != "izmir" || app.WorkModel != "hybrid" || app.Language != "tr_en" {
		t.Fatalf("expected note tags to beat report metadata, got city=%q work=%q lang=%q", app.City, app.WorkModel, app.Language)
	}
	if !app.SalaryTransparent || app.Source != "tag_source" || app.Confidence != "low" || app.ConfidenceScore != 0.50 {
		t.Fatalf("unexpected note tag metadata: salary=%q transparent=%v source=%q confidence=%q score=%.2f", app.SalaryTransparency, app.SalaryTransparent, app.Source, app.Confidence, app.ConfidenceScore)
	}
}
