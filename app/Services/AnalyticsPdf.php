<?php
declare(strict_types=1);

namespace App\Services;

require_once APP_ROOT . '/app/Libraries/fpdf/fpdf.php';

final class AnalyticsPdf
{
    public function generate(array $data): string
    {
        $pdf = new class extends \FPDF {
            public function Header(): void
            {
                $this->SetFont('Helvetica', 'B', 11);
                $this->SetTextColor(45, 90, 39);
                $this->Cell(0, 8, 'ManGROOVES  /  CONSERVATION REPORT', 0, 1);
                $this->SetDrawColor(200, 214, 198);
                $this->Line(15, $this->GetY(), 195, $this->GetY());
                $this->Ln(5);
            }
            public function Footer(): void
            {
                $this->SetY(-15);
                $this->SetFont('Helvetica', '', 8);
                $this->SetTextColor(90, 100, 90);
                $this->Cell(0, 5, 'ManGROOVES | Generated ' . date('Y-m-d H:i') . ' | Page ' . $this->PageNo() . '/{nb}', 0, 0, 'C');
            }
        };
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 22);
        $pdf->AliasNbPages();
        $pdf->SetTitle('ManGROOVES Conservation Analytics');
        $pdf->SetAuthor('ManGROOVES');
        $pdf->AddPage();
        $pdf->SetFont('Helvetica', 'B', 22);
        $pdf->Cell(0, 12, 'Conservation analytics', 0, 1);
        $pdf->SetTextColor(50, 60, 50);
        $text = static function (string $value): string {
            return iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value) ?: $value;
        };
        $line = static function (string $value, bool $bold = false) use ($pdf, $text): void {
            $pdf->SetFont('Helvetica', $bold ? 'B' : '', $bold ? 12 : 10);
            $pdf->MultiCell(0, $bold ? 8 : 6, $text($value), 0, 'L');
        };
        $filters = $data['filters'];
        $line('Report period: ' . $filters['date_from'] . ' to ' . $filters['date_to']);
        $line('Barangay: ' . ($data['barangay_label'] ?? 'All barangays') . ' | Species: ' . ($data['species_label'] ?? 'All species'));
        $pdf->Ln(4);
        $v = $data['verification'];
        $summary = [
            'Verified reports' => (string) ($v['verified'] ?? 0),
            'Pending review' => (string) ($v['pending'] ?? 0),
            'High-risk reports' => (string) $data['high_risk_total'],
            'Current survival' => $data['overall_survival'] === null ? 'N/A' : number_format((float) $data['overall_survival'], 1) . '%',
        ];
        foreach ($summary as $label => $value) {
            $pdf->SetFillColor(237, 244, 235);
            $pdf->SetFont('Helvetica', '', 10);
            $pdf->Cell(125, 9, $label, 0, 0, 'L', true);
            $pdf->SetFont('Helvetica', 'B', 12);
            $pdf->Cell(55, 9, $value, 0, 1, 'R', true);
        }
        $pdf->Ln(5);
        $line('Verified health distribution', true);
        $total = max(1, array_sum($data['health']));
        foreach ($data['health'] as $health => $count) {
            $pdf->SetFont('Helvetica', '', 10);
            $pdf->Cell(35, 8, $health);
            $colors = ['Healthy' => [45, 90, 39], 'Stressed' => [190, 128, 29], 'At Risk' => [182, 65, 65]];
            $pdf->SetFillColor(...($colors[$health] ?? [90, 100, 90]));
            $pdf->Rect($pdf->GetX(), $pdf->GetY() + 2, 100 * (int) $count / $total, 4, 'F');
            $pdf->Cell(110, 8, '');
            $pdf->Cell(35, 8, (string) $count . ' reports', 0, 1, 'R');
        }
        $pdf->Ln(4);
        $line('How to read this report', true);
        $line('Report totals and health use the selected reporting period. Current survival uses the latest verified living count for each cluster divided by its initial seedlings, capped at 100%. Missing counts are shown as N/A.');
        $line('Clusters with complete survival counts: ' . $data['survival_eligible_clusters']);

        $pdf->AddPage();
        $line('Current cluster summary', true);
        if (!$data['clusters']) $line('No clusters match the selected filters.');
        foreach ($data['clusters'] as $cluster) {
            if ($pdf->GetY() > 230) $pdf->AddPage();
            $line($cluster['cluster_code'] . ' - ' . $cluster['name'], true);
            $line($cluster['barangay_name'] . ' | ' . ($cluster['scientific_name'] ?: 'Unidentified species'));
            $survival = $cluster['survival_rate'] === null ? 'N/A' : number_format((float) $cluster['survival_rate'], 1) . '%';
            $line('Health: ' . ($cluster['final_health'] ?: $cluster['latest_health']) . ' | Survival: ' . $survival
                . ' | Living: ' . ($cluster['observed_alive_count'] ?? 'N/A') . ' / Initial: ' . $cluster['initial_seedlings']);
            $pdf->Ln(3);
        }
        $pdf->Ln(4);
        $line('Monthly monitoring trend', true);
        foreach ($data['growth'] as $point) {
            $line($point['month_label'] . ': ' . $point['verified_reports'] . ' verified reports; survival '
                . ($point['survival_rate'] === null ? 'N/A' : number_format((float) $point['survival_rate'], 1) . '%'));
        }
        $pdf->Ln(4);
        $line('Reports requiring attention', true);
        if (!$data['high_risk']) $line('No verified high-risk reports in this period.');
        foreach ($data['high_risk'] as $report) {
            $line($report['report_code'] . ' - ' . ($report['cluster_name'] ?: $report['barangay_name']) . ' | ' . $report['final_health']);
        }
        if ((int) $data['high_risk_total'] > count($data['high_risk'])) {
            $line('Showing the latest ' . count($data['high_risk']) . ' of ' . $data['high_risk_total'] . ' high-risk reports.');
        }
        return $pdf->Output('S');
    }

    public static function download(\PDO $pdo, array $filters): never
    {
        $data = (new AnalyticsService($pdo))->dashboard($filters);
        foreach (['barangay' => ['barangays', 'name'], 'species' => ['mangrove_species', 'scientific_name']] as $key => [$table, $column]) {
            if ($data['filters'][$key . '_id']) {
                $lookup = $pdo->prepare("SELECT {$column} FROM {$table} WHERE id = :id");
                $lookup->execute(['id' => $data['filters'][$key . '_id']]);
                $data[$key . '_label'] = $lookup->fetchColumn() ?: 'Unknown selection';
            }
        }
        $bytes = (new self())->generate($data);
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="mangrooves-analytics-' . date('Y-m-d') . '.pdf"');
        header('Cache-Control: private, no-store');
        header('Content-Length: ' . strlen($bytes));
        echo $bytes;
        exit;
    }
}
