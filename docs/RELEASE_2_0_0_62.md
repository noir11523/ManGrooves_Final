# Release 2.0.0+62

Mangrove timeline now shows **Health history**, **Growth Timeline**, and a compact visit history. Removed the repeated summary cards, introductory paragraphs, first-count explanations and duplicate change notes. Growth Timeline still plots recorded living-mangrove counts; missing counts stay missing and zero stays zero. Existing timeline links and report access permissions are preserved.

Analytics has shorter headings, collapsible filters, three summary cards and a compact list of sites needing attention. Removed the on-screen Methods and data limitations section, repeated survival explanations and the always-unavailable survival card. Calculation methods remain in the PDF report. Chart data, filters, report links, map controls and administrator PDF export still work. The Android chart lists only months with observations; Chart data retains the full selected period.

Analytics opens directly from navigation. The website download link now reads **Android app**, with its existing download icon. The homepage now asks expert applicants for an ID photo, matching registration. Native timeline date labels handle ISO timestamps without displaying the time component. Small-screen summary cards use a compact row, adapting for larger text.

No backend calculations, database records, migrations or role permissions changed. The PHP hosting test command now rebuilds its deployment fixture before testing, so checks cover the current interface instead of an older prepared package.

Validation: 126 web/backend tests and all 23 freshly built PHP hosting checks passed. Flutter analysis found no issues, and the full app suite passed 125 tests with one optional local-network test skipped. Chrome passed 15 responsive page checks at 320, 390 and 1280 pixels, including collapsed/expanded filters, count deep links, unknown counts, report privacy and no horizontal overflow. All four changed PHP templates passed syntax checks.

Android package: `org.mangrooves.mobile`, version code `62`, version name `2.0.0`. Release signature verified. APK size: 60,276,795 bytes. SHA-256: `027A1A7F91E1BF5F432F56457DD738D84C434E5EEFFF629534E64E506BCE5EAA`.
