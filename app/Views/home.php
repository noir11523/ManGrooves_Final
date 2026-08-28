<section class="hero-section">
    <div class="hero-media" aria-hidden="true">
        <img src="<?= e(asset('img/hero-mangroves.png')) ?>" alt="" fetchpriority="high">
    </div>
    <div class="hero-overlay" aria-hidden="true"></div>
    <div class="container hero-content">
        <div class="row align-items-center min-vh-75">
            <div class="col-lg-8 col-xl-7">
                <span class="hero-kicker"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> Cebu coastal communities</span>
                <h1>Every mangrove tells a story. <span>Help us protect it.</span></h1>
                <p class="hero-lead">ManGROOVES connects community guardians and environmental experts through simple, field-ready monitoring that turns local observations into conservation action.</p>
                <div class="hero-actions">
                    <?php if ($authUser): ?>
                        <a class="btn btn-primary btn-lg rounded-pill" href="<?= e(url('dashboard.php')) ?>">
                            Go to your dashboard <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i>
                        </a>
                    <?php else: ?>
                        <button class="btn btn-primary btn-lg rounded-pill" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">
                            Become a guardian <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-outline-light btn-lg rounded-pill" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="login">Sign in</button>
                    <?php endif; ?>
                </div>
                <div class="hero-assurance" aria-label="Platform features">
                    <span><i class="bi bi-phone" aria-hidden="true"></i> Mobile friendly</span>
                    <span><i class="bi bi-shield-check" aria-hidden="true"></i> Expert verified</span>
                    <span><i class="bi bi-people" aria-hidden="true"></i> Community powered</span>
                </div>
            </div>
        </div>
    </div>
    <a class="hero-scroll" href="#about" aria-label="Learn more about ManGROOVES"><i class="bi bi-chevron-down" aria-hidden="true"></i></a>
</section>

<section class="impact-strip" aria-label="ManGROOVES impact">
    <div class="container">
        <div class="row g-0">
            <div class="col-6 col-lg-3 impact-stat">
                <strong><?= e(number_format((int) ($stats['verified_reports'] ?? 0))) ?></strong><span>Verified observations</span>
            </div>
            <div class="col-6 col-lg-3 impact-stat">
                <strong><?= e(number_format((int) ($stats['clusters'] ?? 0))) ?></strong><span>Monitored clusters</span>
            </div>
            <div class="col-6 col-lg-3 impact-stat">
                <strong><?= e(number_format((int) ($stats['species'] ?? 0))) ?></strong><span>Mangrove species</span>
            </div>
            <div class="col-6 col-lg-3 impact-stat">
                <strong><?= e(number_format((int) ($stats['guardians'] ?? 0))) ?></strong><span>Community guardians</span>
            </div>
        </div>
    </div>
</section>

<section class="section-padding" id="about">
    <div class="container">
        <div class="row align-items-center g-5">
            <div class="col-lg-5">
                <span class="section-kicker">Why mangroves matter</span>
                <h2 class="section-title">Small observations create a clearer picture of coastal health.</h2>
                <p class="section-lead">Mangrove forests shelter young marine life, reduce coastal erosion, store carbon, and help communities withstand storms. Regular monitoring helps local teams notice change early.</p>
                <a class="text-link" href="<?= e(url('explore.php')) ?>">Explore local species <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
            </div>
            <div class="col-lg-7">
                <div class="benefit-grid">
                    <article class="benefit-card">
                        <span class="feature-icon"><i class="bi bi-water" aria-hidden="true"></i></span>
                        <h3>Coastal protection</h3>
                        <p>Dense roots slow waves, hold sediment, and reduce shoreline erosion.</p>
                    </article>
                    <article class="benefit-card">
                        <span class="feature-icon"><i class="bi bi-fish" aria-hidden="true"></i></span>
                        <h3>Living nurseries</h3>
                        <p>Root systems offer food and shelter to fish, crabs, birds, and other wildlife.</p>
                    </article>
                    <article class="benefit-card">
                        <span class="feature-icon"><i class="bi bi-cloud-haze2" aria-hidden="true"></i></span>
                        <h3>Climate resilience</h3>
                        <p>Mangroves store significant carbon while helping communities adapt to change.</p>
                    </article>
                    <article class="benefit-card accent-card">
                        <span class="feature-icon"><i class="bi bi-binoculars" aria-hidden="true"></i></span>
                        <h3>Community evidence</h3>
                        <p>Repeat observations reveal patterns that one-time surveys can miss.</p>
                    </article>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="section-padding section-tinted" id="how-it-works">
    <div class="container">
        <div class="section-heading text-center mx-auto">
            <span class="section-kicker">Field reporting made simple</span>
            <h2 class="section-title">From one careful check to verified action</h2>
            <p class="section-lead">The guided report uses clear photos and plain-language choices, so guardians can focus on what they see.</p>
        </div>
        <div class="row g-4 process-row">
            <div class="col-md-4">
                <article class="process-card">
                    <span class="process-number">01</span>
                    <span class="process-icon"><i class="bi bi-pin-map-fill" aria-hidden="true"></i></span>
                    <h3>Capture the site</h3>
                    <p>Use your phone location, choose a known cluster or document a possible new one, and add a clear photo.</p>
                </article>
            </div>
            <div class="col-md-4">
                <article class="process-card">
                    <span class="process-number">02</span>
                    <span class="process-icon"><i class="bi bi-ui-checks-grid" aria-hidden="true"></i></span>
                    <h3>Check visible signs</h3>
                    <p>Compare leaves, pests, roots, bark, and wildlife with visual guides designed for quick field use.</p>
                </article>
            </div>
            <div class="col-md-4">
                <article class="process-card">
                    <span class="process-number">03</span>
                    <span class="process-icon"><i class="bi bi-patch-check-fill" aria-hidden="true"></i></span>
                    <h3>Receive expert review</h3>
                    <p>CCENRO experts verify the finding, provide feedback, and schedule follow-up monitoring when needed.</p>
                </article>
            </div>
        </div>
    </div>
</section>

<section class="section-padding health-guide-section">
    <div class="container">
        <div class="row align-items-end mb-4 g-3">
            <div class="col-lg-7">
                <span class="section-kicker">Know what to look for</span>
                <h2 class="section-title mb-0">A clear health signal at a glance</h2>
            </div>
            <div class="col-lg-5"><p class="section-lead mb-0">The app combines leaf color, pest evidence, and root stability into an initial health suggestion for expert review.</p></div>
        </div>
        <div class="row g-4">
            <div class="col-md-4">
                <article class="health-card health-card-healthy">
                    <span class="health-card-icon"><i class="bi bi-check-circle-fill" aria-hidden="true"></i></span>
                    <div><span class="health-label">Healthy</span><h3>Strong signs of growth</h3><p>Green leaves, no visible pests, and firm, intact roots.</p></div>
                </article>
            </div>
            <div class="col-md-4">
                <article class="health-card health-card-stressed">
                    <span class="health-card-icon"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i></span>
                    <div><span class="health-label">Stressed</span><h3>Needs closer watching</h3><p>Yellowing leaves, light pest damage, or some root disturbance.</p></div>
                </article>
            </div>
            <div class="col-md-4">
                <article class="health-card health-card-risk">
                    <span class="health-card-icon"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
                    <div><span class="health-label">At risk</span><h3>Prompt attention needed</h3><p>Brown leaves, infestation, exposed roots, erosion, or severe damage.</p></div>
                </article>
            </div>
        </div>
    </div>
</section>

<section class="cta-section">
    <div class="container">
        <div class="cta-panel">
            <div>
                <span class="section-kicker text-white-50">Protect what protects us</span>
                <h2>Ready to become a mangrove guardian?</h2>
                <p>Your first observation can help establish the record a coastal site needs.</p>
            </div>
            <?php if ($authUser): ?>
                <a class="btn btn-light btn-lg rounded-pill" href="<?= e(url($authUser['role'] === 'guardian' ? 'submit-report.php' : 'dashboard.php')) ?>">Continue to ManGROOVES</a>
            <?php else: ?>
                <button class="btn btn-light btn-lg rounded-pill" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">Create a free account</button>
            <?php endif; ?>
        </div>
    </div>
</section>

<?php if (!$authUser): ?>
    <?php require APP_ROOT . '/app/Views/partials/auth-modal.php'; ?>
<?php endif; ?>
