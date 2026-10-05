<section class="hero-section" aria-labelledby="home-title">
    <div class="hero-media" aria-hidden="true">
        <img src="<?= e(asset('img/hero-mangroves.webp')) ?>" alt="" width="1536" height="1024" fetchpriority="high">
    </div>
    <div class="hero-overlay" aria-hidden="true"></div>
    <div class="container hero-content">
        <div class="home-hero-grid">
            <div class="home-hero-copy">
                <span class="hero-kicker"><i class="bi bi-geo-alt" aria-hidden="true"></i> Cebu City coastal monitoring</span>
                <h1 id="home-title">Protect mangroves,<br><span>one observation<br>at a time.</span></h1>
                <p class="hero-lead">ManGROOVES helps communities document mangrove conditions, with qualified environmental reviewers supporting continued restoration monitoring.</p>
                <div class="hero-actions">
                    <?php if ($authUser): ?>
                        <a class="btn btn-primary btn-lg" href="<?= e(url('dashboard.php')) ?>">Go to your dashboard <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                    <?php elseif (defined('MANGROOVES_CLOUD')): ?>
                        <a class="btn btn-primary btn-lg" href="<?= e(url('register.php')) ?>">Become a Coastal Guardian <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                    <?php else: ?>
                        <button class="btn btn-primary btn-lg" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">Become a Coastal Guardian <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
                    <?php endif; ?>
                    <a class="btn btn-outline-light btn-lg" href="<?= e(url('explore.php')) ?>">Explore mangroves</a>
                </div>
                <p class="home-reassurance"><i class="bi bi-check2-circle" aria-hidden="true"></i> Guided field observations. Expert review when needed.</p>

            </div>
            <aside class="home-observation" aria-label="Example mangrove observation">
                <div class="home-observation-heading"><i class="bi bi-tree" aria-hidden="true"></i><span>Field observation</span><span class="home-example">Example</span></div>

                <dl>
                    <div><dt>Photo</dt><dd><i class="bi bi-camera" aria-hidden="true"></i> Captured</dd></div>
                    <div><dt>Location</dt><dd>Geo-tagged</dd></div>
                    <div><dt>Review</dt><dd><i class="bi bi-patch-check" aria-hidden="true"></i> Expert validated</dd></div>
                </dl>

            </aside>
        </div>
    </div>
</section>

<section class="section-padding home-roles-section" id="about" aria-labelledby="roles-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">Taking part</span><h2 class="section-title" id="roles-title">Two roles.<br><span>One shared purpose.</span></h2></div>
            <p class="section-lead">Community observations and expert review build reliable monitoring records.</p>
        </div>
        <div class="home-role-grid">
            <article class="home-role-card home-role-guardian">
                <div class="home-role-top"><span class="home-role-badge">Community participant</span><i class="bi bi-people" aria-hidden="true"></i></div>
                <h3>Coastal Guardian</h3>
                <p>Document visible mangrove conditions through photos, location data and a guided field checklist.</p>

                <ol class="home-role-actions" aria-label="What Coastal Guardians do"><li><i class="bi bi-eye" aria-hidden="true"></i>Observe</li><li><i class="bi bi-camera" aria-hidden="true"></i>Photograph</li><li><i class="bi bi-send" aria-hidden="true"></i>Report</li></ol>
                <?php if ($authUser): ?>
                    <a class="text-link" href="<?= e(url($authUser['role'] === 'guardian' ? 'submit-report.php' : 'dashboard.php')) ?>">Continue to ManGROOVES <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                <?php elseif (defined('MANGROOVES_CLOUD')): ?>
                    <a class="text-link" href="<?= e(url('register.php')) ?>">Become a Coastal Guardian <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                <?php else: ?>
                    <button class="text-link home-link-button" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">Become a Coastal Guardian <i class="bi bi-arrow-right" aria-hidden="true"></i></button>
                <?php endif; ?>
            </article>
            <article class="home-role-card home-role-expert">
                <div class="home-role-top"><span class="home-role-badge">Qualified reviewer</span><i class="bi bi-patch-check" aria-hidden="true"></i></div>
                <h3>Verified Expert</h3>
                <p>Qualified environmental professionals and authorized reviewers validate field reports and provide guidance.</p>

                <ol class="home-role-actions" aria-label="What Verified Experts do"><li><i class="bi bi-search" aria-hidden="true"></i>Review</li><li><i class="bi bi-check2-circle" aria-hidden="true"></i>Validate</li><li><i class="bi bi-chat-left-text" aria-hidden="true"></i>Guide</li></ol>
                <a class="text-link" href="#for-experts">Learn about expert verification <i class="bi bi-arrow-down" aria-hidden="true"></i></a>
            </article>
        </div>
    </div>
</section>

<section class="section-padding section-tinted home-process" id="how-it-works" aria-labelledby="process-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">How it works</span><h2 class="section-title" id="process-title">From field observation<br>to informed action.</h2></div>

        </div>
        <ol class="home-process-steps">
            <li><span class="home-step-number">01</span><h3>Observe</h3><p>Visit a monitored area and check visible conditions.</p></li>
            <li><span class="home-step-number">02</span><h3>Document</h3><p>Take a photo, place the location pin and complete the checklist.</p></li>
            <li><span class="home-step-number">03</span><h3>Submit</h3><p>Send your field report through ManGROOVES.</p></li>
            <li><span class="home-step-number">04</span><h3>Review</h3><p>Reports needing review go to a qualified expert for validation or feedback.</p></li>
        </ol>
        <p class="home-process-note">Healthy reports may be verified automatically. Verified records support follow-up monitoring over time.</p>
    </div>
</section>

<section class="section-padding home-benefits" aria-labelledby="benefits-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">Why continued monitoring matters</span><h2 class="section-title" id="benefits-title">Planting is only<br>the beginning.</h2></div>
            <p class="section-lead">Without follow-up records, changes in survival, damage and site condition can be easy to miss.</p>
        </div>
        <div class="home-benefit-grid">
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-clock-history" aria-hidden="true"></i></span><h3>Track change</h3><p>Repeated observations show how local mangrove conditions change.</p></article>
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-eye" aria-hidden="true"></i></span><h3>Spot problems earlier</h3><p>Document damaged roots, unhealthy leaves, pests or debris for review.</p></article>
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-journal-text" aria-hidden="true"></i></span><h3>Support restoration decisions</h3><p>Validated records help CCENRO and stakeholders identify areas needing closer monitoring.</p></article>
        </div>
        <p class="home-local-fact"><i class="bi bi-water" aria-hidden="true"></i> Mangroves help protect shorelines, shelter marine life and store carbon. Continued care matters as much as planting.</p>
    </div>
</section>

<section class="section-padding health-guide-section" id="health-guide" aria-labelledby="health-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">A simple field guide</span><h2 class="section-title" id="health-title">What should you look for?</h2></div>
            <p class="section-lead">Record what you clearly see. Expert reviewers handle the scientific evaluation.</p>
        </div>
        <div class="home-health-grid">
            <article class="health-card health-card-healthy"><span class="health-card-icon"><i class="bi bi-check-circle" aria-hidden="true"></i></span><div><span class="health-label">Healthy</span><h3>Strong signs of growth</h3><ul><li>Green leaves</li><li>Stable, intact roots</li><li>No obvious damage</li></ul></div></article>
            <article class="health-card health-card-stressed"><span class="health-card-icon"><i class="bi bi-eye" aria-hidden="true"></i></span><div><span class="health-label">Watch</span><h3>Worth a closer look</h3><ul><li>Yellowing leaves</li><li>Minor pest signs</li><li>Small visible changes</li></ul></div></article>
            <article class="health-card health-card-risk"><span class="health-card-icon"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span><div><span class="health-label">Needs attention</span><h3>An issue to report</h3><ul><li>Brown or dying leaves</li><li>Heavy pest damage</li><li>Damaged roots or visible debris</li></ul></div></article>
        </div>
        <p class="home-guide-note">These are observation tips, not a diagnosis.</p>

    </div>
</section>

<section class="impact-strip" aria-labelledby="impact-title" <?= defined('MANGROOVES_CLOUD') ? 'data-home-stats aria-busy="true"' : '' ?>>
    <div class="container">
        <div class="home-impact-heading"><h2 id="impact-title">Community monitoring at a glance.</h2></div>
        <div class="row g-0">
            <?php foreach (['verified_reports' => ['patch-check', 'Verified observations'], 'clusters' => ['geo-alt', 'Monitored locations'], 'species' => ['tree', 'Mangrove species'], 'guardians' => ['people', 'Coastal Guardians']] as $key => [$icon, $label]): ?>
            <div class="col-6 col-lg-3 impact-stat"><i class="bi bi-<?= e($icon) ?>" aria-hidden="true"></i><strong data-stat="<?= e($key) ?>"><?= defined('MANGROOVES_CLOUD') ? '—' : e(number_format((int) ($stats[$key] ?? 0))) ?></strong><span><?= e($label) ?></span></div>
            <?php endforeach; ?>
        </div>
        <?php if (defined('MANGROOVES_CLOUD')): ?><p class="small mb-0 mt-2" data-stats-status role="status">Loading community totals…</p><noscript><p class="small">Enable JavaScript to see community totals.</p></noscript><?php endif; ?>
    </div>
</section>

<section class="section-padding home-explore-section" id="explore" aria-labelledby="explore-title">
    <div class="container home-explore-grid">
        <div class="home-explore-visual">
            <img src="<?= e(asset('img/hero-mangroves.webp')) ?>" alt="Mangrove roots along a sheltered coast" width="1536" height="1024" loading="lazy" decoding="async">
            <span class="home-place-label"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> A closer look at our coast</span>
        </div>
        <div class="home-explore-copy"><span class="section-kicker">Start with a place</span><h2 class="section-title" id="explore-title">Explore monitored<br>mangrove areas.</h2><p class="section-lead">View monitoring locations, recorded species and verified observations on the map.</p><a class="btn btn-outline-primary" href="<?= e(url('explore.php')) ?>">Explore mangrove map <i class="bi bi-arrow-up-right ms-2" aria-hidden="true"></i></a></div>
    </div>
</section>

<section class="home-expert-section" id="for-experts" aria-labelledby="expert-title">
    <div class="container">
        <div class="home-expert-panel">
            <div class="home-expert-intro">
                <h2 class="section-title" id="expert-title">Expert-reviewed monitoring</h2>
                <?php if (defined('MANGROOVES_CLOUD')): ?>
                    <p>Expert applicants enter a work or professional ID code. An administrator checks the credential before granting review access.</p>
                    <a class="text-link" href="<?= e(url('register.php')) ?>">Apply as an expert <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                <?php else: ?>
                    <p>Expert access is managed by the project administrator. Qualified professionals and authorized reviewers need approval before they can review community reports.</p>
                <?php endif; ?>
            </div>
            <div class="home-expert-process">
                <?php if (defined('MANGROOVES_CLOUD')): ?>
                    <ol><li><span>01</span>Apply</li><li><span>02</span>Credential check</li><li><span>03</span>Approval</li><li><span>04</span>Review reports</li></ol>
                <?php endif; ?>

            </div>
        </div>
    </div>
</section>

<section class="cta-section" aria-labelledby="cta-title">
    <div class="container">
        <div class="cta-panel">
            <div><span class="section-kicker">Protect what protects us</span><h2 id="cta-title">Help keep mangrove<br>restoration monitored.</h2><p>Document local conditions and contribute to a clearer record of restoration progress.</p></div>
            <div class="home-cta-actions">
                <?php if ($authUser): ?>
                    <a class="btn btn-light btn-lg" href="<?= e(url($authUser['role'] === 'guardian' ? 'submit-report.php' : 'dashboard.php')) ?>">Continue to ManGROOVES <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                <?php elseif (defined('MANGROOVES_CLOUD')): ?>
                    <a class="btn btn-light btn-lg" href="<?= e(url('register.php')) ?>">Become a Coastal Guardian <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                <?php else: ?>
                    <button class="btn btn-light btn-lg" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">Become a Coastal Guardian <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
                <?php endif; ?>
                <a class="home-cta-secondary" href="#how-it-works">See how it works</a>
            </div>
        </div>
    </div>
</section>

<?php if (!$authUser && !defined('MANGROOVES_CLOUD')): ?>
    <?php require APP_ROOT . '/app/Views/partials/auth-modal.php'; ?>
<?php endif; ?>
