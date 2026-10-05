<section class="hero-section" aria-labelledby="home-title">
    <div class="hero-media" aria-hidden="true">
        <img src="<?= e(asset('img/hero-mangroves.webp')) ?>" alt="" width="1536" height="1024" fetchpriority="high">
    </div>
    <div class="hero-overlay" aria-hidden="true"></div>
    <div class="container hero-content">
        <div class="home-hero-grid">
            <div class="home-hero-copy">
                <span class="hero-kicker"><i class="bi bi-geo-alt" aria-hidden="true"></i> Cebu coastal communities</span>
                <h1 id="home-title">Protect mangroves,<br><span>one observation<br>at a time.</span></h1>
                <p class="hero-lead">Your local knowledge matters. Document mangrove conditions with your community, with verified experts on hand to review reports and share feedback.</p>
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
                <p class="home-reassurance"><i class="bi bi-check2-circle" aria-hidden="true"></i> No environmental experience required.</p>
                <dl class="home-hero-roles">
                    <div><dt>Coastal Guardian</dt><dd>Community member who observes and reports.</dd></div>
                    <div><dt>Verified Expert</dt><dd>Qualified reviewer who verifies reports.</dd></div>
                </dl>
            </div>
            <aside class="home-observation" aria-label="Example mangrove observation">
                <div class="home-observation-heading"><i class="bi bi-tree" aria-hidden="true"></i><span>Mangrove observation</span><span class="home-example">Example</span></div>
                <p>One visit. A clearer picture.</p>
                <dl>
                    <div><dt>Site condition</dt><dd><i class="bi bi-check-circle" aria-hidden="true"></i> Healthy</dd></div>
                    <div><dt>Community report</dt><dd>Submitted</dd></div>
                    <div><dt>Expert review</dt><dd><i class="bi bi-patch-check" aria-hidden="true"></i> Reviewed</dd></div>
                </dl>
                <span class="home-observation-note">Local observations. Shared understanding.</span>
            </aside>
        </div>
    </div>
</section>

<section class="section-padding home-roles-section" id="about" aria-labelledby="roles-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">There is a place for you here</span><h2 class="section-title" id="roles-title">Two roles. <span>One goal.</span></h2></div>
            <p class="section-lead">Community knowledge and expert review work together to help protect our coast.</p>
        </div>
        <div class="home-role-grid">
            <article class="home-role-card home-role-guardian">
                <div class="home-role-top"><span class="home-role-badge">For community members</span><i class="bi bi-people" aria-hidden="true"></i></div>
                <h3>Coastal Guardian</h3>
                <p>Residents, students, volunteers and fisherfolk can all help. Visit a site and record what you see.</p>
                <p class="home-role-promise">No professional experience needed.</p>
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
                <div class="home-role-top"><span class="home-role-badge">For qualified reviewers</span><i class="bi bi-patch-check" aria-hidden="true"></i></div>
                <h3>Verified Expert</h3>
                <p>An environmental professional or authorized reviewer who evaluates community reports and shares helpful feedback.</p>
                <p class="home-role-promise">Credentials checked. Admin approval required.</p>
                <ol class="home-role-actions" aria-label="What Verified Experts do"><li><i class="bi bi-search" aria-hidden="true"></i>Review</li><li><i class="bi bi-check2-circle" aria-hidden="true"></i>Verify</li><li><i class="bi bi-chat-left-text" aria-hidden="true"></i>Give feedback</li></ol>
                <a class="text-link" href="#for-experts">Learn about expert verification <i class="bi bi-arrow-down" aria-hidden="true"></i></a>
            </article>
        </div>
    </div>
</section>

<section class="section-padding section-tinted home-process" id="how-it-works" aria-labelledby="process-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">How it works</span><h2 class="section-title" id="process-title">From observation<br>to informed action.</h2></div>
            <p class="section-lead">A photo and a few simple questions.<br>That is where better monitoring begins.</p>
        </div>
        <ol class="home-process-steps">
            <li><span class="home-step-number">01</span><h3>Visit</h3><p>Go to a mangrove monitoring site when it is safe to do so.</p></li>
            <li><span class="home-step-number">02</span><h3>Observe</h3><p>Look at the leaves, roots, pests and any visible damage.</p></li>
            <li><span class="home-step-number">03</span><h3>Report</h3><p>Take a clear photo and answer the guided questions.</p></li>
            <li><span class="home-step-number">04</span><h3>Review</h3><p>Experts check reports that need review and may give feedback.</p></li>
        </ol>
        <p class="home-process-note">Healthy reports may be verified automatically. Reports needing attention go to an expert for review.</p>
    </div>
</section>

<section class="section-padding home-benefits" aria-labelledby="benefits-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">Why mangroves matter</span><h2 class="section-title" id="benefits-title">Small observations.<br>A bigger picture.</h2></div>
            <p class="section-lead">Repeated visits help communities notice changes in mangrove health and coastal conditions over time.</p>
        </div>
        <div class="home-benefit-grid">
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-water" aria-hidden="true"></i></span><h3>Coastal protection</h3><p>Roots help soften waves and reduce shoreline erosion.</p></article>
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-tree" aria-hidden="true"></i></span><h3>Wildlife habitat</h3><p>Mangroves shelter young fish, crabs and other wildlife.</p></article>
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-cloud-sun" aria-hidden="true"></i></span><h3>Climate support</h3><p>Mangrove trees and soils store carbon.</p></article>
            <article class="benefit-card"><span class="feature-icon"><i class="bi bi-journal-text" aria-hidden="true"></i></span><h3>Community evidence</h3><p>Regular reports build a record of how local sites change.</p></article>
        </div>
    </div>
</section>

<section class="section-padding health-guide-section" id="health-guide" aria-labelledby="health-title">
    <div class="container">
        <div class="home-section-heading">
            <div><span class="section-kicker">A simple field guide</span><h2 class="section-title" id="health-title">What should you look for?</h2></div>
            <p class="section-lead">You do not need to diagnose the mangrove. Just record what you can clearly see.</p>
        </div>
        <div class="home-health-grid">
            <article class="health-card health-card-healthy"><span class="health-card-icon"><i class="bi bi-check-circle" aria-hidden="true"></i></span><div><span class="health-label">Healthy</span><h3>Strong signs of growth</h3><ul><li>Green leaves</li><li>Stable, intact roots</li><li>No obvious damage</li></ul></div></article>
            <article class="health-card health-card-stressed"><span class="health-card-icon"><i class="bi bi-eye" aria-hidden="true"></i></span><div><span class="health-label">Watch</span><h3>Worth a closer look</h3><ul><li>Yellowing leaves</li><li>Minor pest signs</li><li>Small visible changes</li></ul></div></article>
            <article class="health-card health-card-risk"><span class="health-card-icon"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span><div><span class="health-label">Needs attention</span><h3>An issue to report</h3><ul><li>Brown or dying leaves</li><li>Heavy pest damage</li><li>Damaged roots or major damage</li></ul></div></article>
        </div>
        <p class="home-guide-note">These are observation tips, not a diagnosis.</p>
        <p class="home-role-reminder"><span>Coastal Guardians <strong>observe.</strong></span><i class="bi bi-arrow-right" aria-hidden="true"></i><span>Verified Experts <strong>evaluate.</strong></span></p>
    </div>
</section>

<?php if (!defined('MANGROOVES_CLOUD') || ($cloudStatsAvailable ?? false)): ?>
<section class="impact-strip" aria-labelledby="impact-title">
    <div class="container">
        <div class="home-impact-heading"><h2 id="impact-title">Our community, in action.</h2><span>From the ManGROOVES record</span></div>
        <div class="row g-0">
            <div class="col-6 col-lg-3 impact-stat"><i class="bi bi-patch-check" aria-hidden="true"></i><strong><?= e(number_format((int) ($stats['verified_reports'] ?? 0))) ?></strong><span>Verified observations</span></div>
            <div class="col-6 col-lg-3 impact-stat"><i class="bi bi-geo-alt" aria-hidden="true"></i><strong><?= e(number_format((int) ($stats['clusters'] ?? 0))) ?></strong><span>Monitored locations</span></div>
            <div class="col-6 col-lg-3 impact-stat"><i class="bi bi-tree" aria-hidden="true"></i><strong><?= e(number_format((int) ($stats['species'] ?? 0))) ?></strong><span>Mangrove species</span></div>
            <div class="col-6 col-lg-3 impact-stat"><i class="bi bi-people" aria-hidden="true"></i><strong><?= e(number_format((int) ($stats['guardians'] ?? 0))) ?></strong><span>Coastal Guardians</span></div>
        </div>
    </div>
</section>
<?php endif; ?>

<section class="section-padding home-explore-section" id="explore" aria-labelledby="explore-title">
    <div class="container home-explore-grid">
        <div class="home-explore-visual">
            <img src="<?= e(asset('img/hero-mangroves.webp')) ?>" alt="Mangrove roots along a sheltered coast" width="1536" height="1024" loading="lazy" decoding="async">
            <span class="home-place-label"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> A closer look at our coast</span>
        </div>
        <div class="home-explore-copy"><span class="section-kicker">Start with a place</span><h2 class="section-title" id="explore-title">Explore local<br>mangroves.</h2><p class="section-lead">Discover monitoring locations, recorded species and shared findings on the existing mangrove map.</p><a class="btn btn-outline-primary" href="<?= e(url('explore.php')) ?>">Explore mangrove map <i class="bi bi-arrow-up-right ms-2" aria-hidden="true"></i></a></div>
    </div>
</section>

<section class="home-expert-section" id="for-experts" aria-labelledby="expert-title">
    <div class="container">
        <div class="home-expert-panel">
            <div class="home-expert-intro">
                <span class="section-kicker">Trust through review</span><h2 class="section-title" id="expert-title">How expert verification works</h2>
                <?php if (defined('MANGROOVES_CLOUD')): ?>
                    <p>Choose Expert during registration and enter your work or professional ID code. An administrator reviews your application before you can sign in as an expert.</p>
                    <a class="text-link" href="<?= e(url('register.php')) ?>">Apply as an expert <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                <?php else: ?>
                    <p>Expert access is managed by the project administrator. Qualified professionals and authorized reviewers need approval before they can review community reports.</p>
                <?php endif; ?>
            </div>
            <div class="home-expert-process">
                <?php if (defined('MANGROOVES_CLOUD')): ?>
                    <ol><li><span>01</span>Apply</li><li><span>02</span>Enter your ID code</li><li><span>03</span>Admin reviews your application</li><li><span>04</span>Approved to review reports</li></ol>
                <?php endif; ?>
                <p><i class="bi bi-info-circle" aria-hidden="true"></i> Coastal Guardians do <strong>not</strong> need professional credentials.</p>
            </div>
        </div>
    </div>
</section>

<section class="cta-section" aria-labelledby="cta-title">
    <div class="container">
        <div class="cta-panel">
            <div><span class="section-kicker">Protect what protects us</span><h2 id="cta-title">Your coast needs more<br>eyes on the ground.</h2><p>Help create a clearer record of your local mangroves.</p></div>
            <div class="home-cta-actions">
                <?php if ($authUser): ?>
                    <a class="btn btn-light btn-lg" href="<?= e(url($authUser['role'] === 'guardian' ? 'submit-report.php' : 'dashboard.php')) ?>">Continue to ManGROOVES <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                <?php elseif (defined('MANGROOVES_CLOUD')): ?>
                    <a class="btn btn-light btn-lg" href="<?= e(url('register.php')) ?>">Create free Guardian account <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></a>
                <?php else: ?>
                    <button class="btn btn-light btn-lg" type="button" data-bs-toggle="modal" data-bs-target="#authModal" data-auth-tab="register">Create free Guardian account <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
                <?php endif; ?>
                <a class="home-cta-secondary" href="#how-it-works">See how it works</a><span>No environmental degree required.</span>
            </div>
        </div>
    </div>
</section>

<?php if (!$authUser && !defined('MANGROOVES_CLOUD')): ?>
    <?php require APP_ROOT . '/app/Views/partials/auth-modal.php'; ?>
<?php endif; ?>
