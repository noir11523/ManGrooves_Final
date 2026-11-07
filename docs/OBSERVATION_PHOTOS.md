# Observation choice photographs

Catalog version 3 contains **31 real photographs**, including **12 Drive photographs/details**. No active mapping uses an AI image or collage. Choice labels remain visible; source and processing details stay in the separate [credits resource](../public/assets/observation-photo-credits.html), with no inline credit beneath a choice.

## Review of label matches

The [shared Drive folder](https://drive.google.com/drive/folders/106kHhvzyzrS1SWEBqPvX0eLe0bpVPuVj) was checked on 7 November 2026: 9 folders, 63 files, including 56 photographs. All 56 source photos were visually reviewed. Fourteen selected originals were freshly downloaded and matched the cached originals byte for byte. Duplicate source files were not treated as independent confirmation of species identity.

- Replaced the complete uprooted-tree example with a photographic example of superficial root damage (Hendy & Cragg, Figure 2A). It illustrates **some damage**, not measurable looseness.
- Replaced the dead whole-tree example with an actual deteriorated root photographed with wood-borer tunnels (Hendy & Cragg, Figure 1B).
- Restored the visibly chewed Lumnitzera leaf example for damaged leaves. Normal Rhizophora cork warts are not presented as disease or insect damage.
- Replaced the distant leaf canopy used for dark dots with an actual Rhizophora mucronata leaf-underside photograph (Ngernsaengsaruay et al., Figure 9F).
- Separated intact bark and flaking bark. Clearer Drive bark details show texture; a licensed fissured-bark fallback shows the deep-cracks example at its original resolution.
- Used a whole Nypa palm for the bark-not-applicable choice. Added the existing localized leaf-shape value `Oval nga dahon (Elliptic)` to the image mappings so that choice has a photo.
- The two pencil-root values and the two prop/stilt-root values describe equivalent visible structures; sharing a suitable photo is intentional. No species definitions or saved answers were merged.
- The Drive file named `looping_roots_01.jpg` shows basal supports, not clear loops; a licensed real knee-root example remains a **shape illustration**, not proof of Lumnitzera identity.

The reviewed pictures show visible examples, not a diagnosis. A photograph cannot establish root firmness, brittleness, absence of pests, or overall condition. Bark fissures and tiny leaf cork warts may be natural features. Expert review remains required. Not Sure and the combination/absence choices stay text-only; they have no single corresponding photograph. Existing administrator uploads are preserved by the installer.

## Sources supporting the replacements

- [Hendy & Cragg (2017), Hydrobiologia, DOI:10.1007/s10750-017-3106-6](https://link.springer.com/article/10.1007/s10750-017-3106-6), Figures 1B and 2A; CC BY 4.0. The article identifies superficial experimental damage and necrotic/dead tissue associated with root-borer tunnels.
- [Ngernsaengsaruay et al. (2024), PeerJ 12:e17460](https://peerj.com/articles/17460/) ([open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11216214/)), Figure 9F, photograph by Chatchai Ngernsaengsaruay; CC BY 4.0. The figure documents natural cork warts on the underside of R. mucronata leaves.
- [Homer Edward Price, black-mangrove bark](https://commons.wikimedia.org/wiki/File:Black-mangrove-bark_(13746385495).gif); CC BY 2.0. This is a texture example of Avicennia germinans, not a species match for every tree with fissured bark.
- [University of Florida, Lumnitzera racemosa](https://plant-directory.ifas.ufl.edu/plant-directory/lumnitzera-racemosa/) describes occasionally looping lateral roots. The shape illustration does not replace a botanical identification.

## Installation and safety

The manifest is `supabase/functions/api/data/observation-photos.json`. Preview with `node supabase/scripts/install-observation-photos.js --project YOUR_PROJECT_REF` using the operator key locally; add `--apply` to install. It verifies JPEG checksums, backs up the current references under ignored `tmp/reference-photo-backups`, uploads versioned assets, and changes only eligible default image paths and checklist revision tokens. English seeded labels and original bilingual labels are accepted; administrator-edited labels and custom uploads remain protected. Revision tokens are UUIDs, avoiding invalid numeric conversions of edited checklist versions. Empty legacy tokens are repaired. Scores, option IDs, labels, species definitions and report history remain unchanged. Reinstallation is idempotent.

Web, mobile web and Flutter obtain current image paths from the same API; Android resolves packaged paths through the public `mangrooves-reference` Storage bucket. Refresh/reopen the form to retrieve the updates; an APK rebuild is not required for reference-data changes. Keep legacy assets available for old references. Regenerate this document and the attribution resource with `node supabase/scripts/document-observation-photos.js`.

## Active image mappings

| Category | Choice / trait value | Photo |
| --- | --- | --- |
| leaf_color | Green | [v2-drive-avicennia_marina-leaf_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-leaf_01.jpg) |
| leaf_color | Light / Yellow-Green | [v1-yellow-green-leaves.jpg](../public/assets/img/observations/v1-yellow-green-leaves.jpg) |
| leaf_color | Brown / Yellow-Brown | [v1-brown-leaf.jpg](../public/assets/img/observations/v1-brown-leaf.jpg) |
| leaf_condition | Hapsay ug himsog (Smooth & Healthy) | [v2-drive-avicennia_marina-leaf_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-leaf_01.jpg) |
| leaf_condition | Sinaw / Nagkulot / Nag-atubang pataas (Waxy / Curled / Pointing Up) | [v2-drive-rhizophora_stylosa-leaf_01.jpg](../public/assets/img/observations/v2-drive-rhizophora_stylosa-leaf_01.jpg) |
| leaf_condition | Naay gisi / Buslot / Itom nga tuldok (Damaged / Holes / Dark Spots) | [v1-leaf-dark-spots.jpg](../public/assets/img/observations/v1-leaf-dark-spots.jpg) |
| leaf_condition | Daling mabali / Uga (Brittle / Dry) | [v1-dry-leaves.jpg](../public/assets/img/observations/v1-dry-leaves.jpg) |
| pests | Walay nakitang peste (None Visible) | [v2-drive-avicennia_marina-leaf_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-leaf_01.jpg) |
| pests | Gamay nga buslot / Kagat (Few Holes / Bites) | [v1-leaf-bites.jpg](../public/assets/img/observations/v1-leaf-bites.jpg) |
| pests | Daghang buslot / Sapot (Many Holes / Webbing) | [v1-caterpillar-damage.jpg](../public/assets/img/observations/v1-caterpillar-damage.jpg) |
| roots | Lig-on ug walay daot (Firm & Intact) | [v2-drive-shared_characteristics-prop_roots_01.jpg](../public/assets/img/observations/v2-drive-shared_characteristics-prop_roots_01.jpg) |
| roots | Luag / Naay gamay nga daot (Loose / Some Damage) | [v3-superficial-root-damage.jpg](../public/assets/img/observations/v3-superficial-root-damage.jpg) |
| roots | Niukab ang gamot / Naanod ang yuta (Exposed / Erosion Visible) | [v1-root-erosion.jpg](../public/assets/img/observations/v1-root-erosion.jpg) |
| roots | Patay / Nadunot (Dead / Rotten) | [v3-dead-root-tissue.jpg](../public/assets/img/observations/v3-dead-root-tissue.jpg) |
| bark_trunk | Hapsay ug walay daot (Intact / Smooth) | [v3-drive-intact-bark.jpg](../public/assets/img/observations/v3-drive-intact-bark.jpg) |
| bark_trunk | Gamayng napaksit / Naay liki (Slightly Peeling / Cracks) | [v2-drive-avicennia_marina-bark_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-bark_01.jpg) |
| bark_trunk | Dagko ug lawom nga liki (Deep Cracks / Fissures) | [v3-fissured-bark.jpg](../public/assets/img/observations/v3-fissured-bark.jpg) |
| bark_trunk | Naay dakong parte nga nadaot (Missing / Large Damage) | [v1-broken-trunk.jpg](../public/assets/img/observations/v1-broken-trunk.jpg) |
| bio_indicators | Tambasakan (Mudskipper) | [v1-mudskipper.jpg](../public/assets/img/observations/v1-mudskipper.jpg) |
| bio_indicators | Mga langgam (Birds) | [v1-mangrove-birds.jpg](../public/assets/img/observations/v1-mangrove-birds.jpg) |
| bio_indicators | Mga gagmay nga isda (Small Fish) | [v1-small-fish.jpg](../public/assets/img/observations/v1-small-fish.jpg) |
| bio_indicators | Mga kuhol / Kabhang (Snails / Shells) | [v1-shells.jpg](../public/assets/img/observations/v1-shells.jpg) |
| bio_indicators | Mga alibangbang / Putyukan (Butterflies / Bees) | [v1-butterfly.jpg](../public/assets/img/observations/v1-butterfly.jpg) |
| negative_signs | Naay basura / Plastik (Trash / Plastic Visible) | [v1-plastic-litter.jpg](../public/assets/img/observations/v1-plastic-litter.jpg) |
| root_type | Creeping rhizomes | [v2-drive-nypa_fruticans-roots_01.jpg](../public/assets/img/observations/v2-drive-nypa_fruticans-roots_01.jpg) |
| root_type | Looping (older trees) | [v1-looping-roots.jpg](../public/assets/img/observations/v1-looping-roots.jpg) |
| root_type | Pneumatophores (pencil-like) | [v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg](../public/assets/img/observations/v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg) |
| root_type | Pneumatophores (pencil-like projections) | [v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg](../public/assets/img/observations/v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg) |
| root_type | Prop roots | [v2-drive-shared_characteristics-prop_roots_01.jpg](../public/assets/img/observations/v2-drive-shared_characteristics-prop_roots_01.jpg) |
| root_type | Prop roots (stilt roots) | [v2-drive-shared_characteristics-prop_roots_01.jpg](../public/assets/img/observations/v2-drive-shared_characteristics-prop_roots_01.jpg) |
| leaf_shape | Elliptic | [v2-drive-avicennia_marina-leaf_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-leaf_01.jpg) |
| leaf_shape | Elliptic (with dark dots) | [v3-rhizophora-leaf-dots.jpg](../public/assets/img/observations/v3-rhizophora-leaf-dots.jpg) |
| leaf_shape | Elliptic (waxy, leaves point upward) | [v2-drive-rhizophora_stylosa-leaf_01.jpg](../public/assets/img/observations/v2-drive-rhizophora_stylosa-leaf_01.jpg) |
| leaf_shape | Lanceolate (leaflets) | [v2-drive-nypa_fruticans-leaf_01.jpg](../public/assets/img/observations/v2-drive-nypa_fruticans-leaf_01.jpg) |
| leaf_shape | Obovate | [v2-drive-lumnitzera_racemosa-leaf_01.jpg](../public/assets/img/observations/v2-drive-lumnitzera_racemosa-leaf_01.jpg) |
| leaf_shape | Oval nga dahon (Elliptic) | [v2-drive-avicennia_marina-leaf_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-leaf_01.jpg) |
| bark_texture | Smooth with thin flakes, greenish brown | [v2-drive-avicennia_marina-bark_01.jpg](../public/assets/img/observations/v2-drive-avicennia_marina-bark_01.jpg) |
| bark_texture | Slightly rough, brown | [v2-drive-lumnitzera_racemosa-bark_01.jpg](../public/assets/img/observations/v2-drive-lumnitzera_racemosa-bark_01.jpg) |
| bark_texture | Rough, fibrous, brown with deep fissures | [v3-fissured-bark.jpg](../public/assets/img/observations/v3-fissured-bark.jpg) |
| bark_texture | N/A (palm) | [v3-drive-nypa-palm.jpg](../public/assets/img/observations/v3-drive-nypa-palm.jpg) |
| bark_texture | Rough, grayish to brown | [v3-drive-rough-bark.jpg](../public/assets/img/observations/v3-drive-rough-bark.jpg) |

## Per-photo sources

### v1-yellow-green-leaves.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Black_Mangrove_Leaves_-_Flickr_-_treegrow.jpg)
- Credit: Katja Schulz from Washington, D. C., USA
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized

### v1-brown-leaf.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized
- Note: Fallen brown mangrove leaf; compare the color of leaves still on your tree.

### v1-dry-leaves.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Avicennia_marina_ssp._australasica_Lord_Howe_Island.jpg)
- Credit: John Game
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Resized
- Note: Dried reference specimen. Check whether leaves on the tree are dry or brittle.

### v1-leaf-bites.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Keeled-pod_mangrove_(Heritiera_littoralis)_leaves.jpg)
- Credit: David E Mead
- License: CC0 ([details](https://creativecommons.org/publicdomain/zero/1.0/deed.en))
- Changes: Cropped and resized
- Note: Chewed leaf edges are visible in this mangrove leaf sample.

### v1-caterpillar-damage.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Mangrove_Skipper_(Phocides_pigmalion)_(11381559594).jpg)
- Credit: Bob Peterson from North Palm Beach, Florida, Planet Earth!
- License: CC BY-SA 2.0 ([details](https://creativecommons.org/licenses/by-sa/2.0))
- Changes: Resized
- Note: Caterpillar and extensive feeding damage on a mangrove leaf.

### v1-leaf-dark-spots.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Lumnitzera_racemosa,_Black_Mangrove_W_IMG_6941.jpg)
- Credit: J.M.Garg
- License: CC BY-SA 4.0 ([details](https://creativecommons.org/licenses/by-sa/4.0))
- Changes: Cropped and resized
- Note: Visible holes and damaged edges on Lumnitzera leaves.

### v1-root-erosion.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Avicennia_marina_bare_rooted_by_erosion_Nudgee_Creek_Nudgee_Beach_Bramble_Bay_Queensland_P1040563.jpg)
- Credit: John Robert McPherson
- License: CC BY-SA 4.0 ([details](https://creativecommons.org/licenses/by-sa/4.0))
- Changes: Resized

### v1-broken-trunk.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Old_Dead_Mangrove_w-live_one_in_rear_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: CC BY 3.0 ([details](https://creativecommons.org/licenses/by/3.0))
- Changes: Cropped and resized
- Note: Broken trunk and missing wood on a dead mangrove.

### v1-mudskipper.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Mudskipper_(Oxudercinae),_Sungei_Buloh_Wetland_Reserve,_Singapore.jpg)
- Credit: Lulumac89 at en.wikipedia.
- License: Public domain
- Changes: Resized

### v1-mangrove-birds.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Little_blue_herons_on_mangrove_roots_-_DPLA_-_8783f676f5a0b49ecc4171f5fc106a93.jpg)
- Credit: Department of the Interior. U.S. Fish and Wildlife Service. National Conservation Training Center. 10/1997-8888
- License: Public domain
- Changes: Resized

### v1-small-fish.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Mangrove_Mollies_(Poecilia_orri)_feeding_on_a_leaf_-_Carwash_Cenote_QR_2020.jpg)
- Credit: Bernard DUPONT
- License: CC BY-SA 2.0 ([details](https://creativecommons.org/licenses/by-sa/2.0))
- Changes: Resized

### v1-shells.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized

### v1-butterfly.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Avicennia_sp._with_Arhopala_amantes_03164.jpg)
- Credit: Vengolis
- License: CC BY-SA 4.0 ([details](https://creativecommons.org/licenses/by-sa/4.0))
- Changes: Resized

### v1-plastic-litter.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Charkop_Dumping.JPG)
- Credit: DLS
- License: Public domain
- Changes: Resized

### v1-looping-roots.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Bruguiera_gymnorhiza_roots.jpg)
- Credit: Anonymous Powered
- License: CC BY-SA 3.0 ([details](https://creativecommons.org/licenses/by-sa/3.0))
- Changes: Cropped and resized
- Note: Looped knee-root example from Bruguiera; use this to compare root form, not identify a species.

### v2-drive-avicennia_marina-leaf_01.jpg

- Source: [original](https://drive.google.com/file/d/1K1q4U1woRq7ru3TSvEnArAf8X-8ymbrO/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-rhizophora_stylosa-leaf_01.jpg

- Source: [original](https://drive.google.com/file/d/1YSiOl9hbPt7OYWRl_917d9ehG-jMDupY/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-shared_characteristics-prop_roots_01.jpg

- Source: [original](https://drive.google.com/file/d/1zTmE5GDOXDjVxdX3eWhCLX4pC45YSInH/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-avicennia_marina-bark_01.jpg

- Source: [original](https://drive.google.com/file/d/1iW_I7oEK9nBSl3oFbfqeT5wdZQCDsuye/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-nypa_fruticans-roots_01.jpg

- Source: [original](https://drive.google.com/file/d/1sS3bYgYkj9OJaZk3bUil9YG76IOdukNB/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg

- Source: [original](https://drive.google.com/file/d/1x5Zcw-XD2plBsIAxmYpcB0-03qdjj96h/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-nypa_fruticans-leaf_01.jpg

- Source: [original](https://drive.google.com/file/d/1911C4Y1mRG9Em_jkOxV2Wd5LcRZyjryZ/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-lumnitzera_racemosa-leaf_01.jpg

- Source: [original](https://drive.google.com/file/d/18hoekqtY7yFz1dWW7n-KH-ZJwOgmd7M4/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-lumnitzera_racemosa-bark_01.jpg

- Source: [original](https://drive.google.com/file/d/1VqcUvOBJUa1n4heBTY_fxfabZc7Wr0RG/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v3-drive-intact-bark.jpg

- Source: [original](https://drive.google.com/file/d/1pY1F3dtPsslRa1TrCO2baAfRJ5U2h9No/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Cropped to show the visible feature; JPEG optimized

### v3-drive-rough-bark.jpg

- Source: [original](https://drive.google.com/file/d/1pJcqmxieII_Epe5U4NSfqydEPSJ8i_CR/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Cropped to show the visible feature; JPEG optimized

### v3-drive-nypa-palm.jpg

- Source: [original](https://drive.google.com/file/d/1F-C0sB_24L_n13pvZre0cg0Oc3nQOOUn/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v3-fissured-bark.jpg

- Source: [original](https://commons.wikimedia.org/wiki/File:Black-mangrove-bark_(13746385495).gif)
- Credit: Homer Edward Price
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0/))
- Changes: Converted to JPEG; full image retained
- Note: Fissured Avicennia germinans bark; illustrates visible texture rather than identifying the observed species or diagnosing damage.

### v3-superficial-root-damage.jpg

- Source: [original](https://link.springer.com/article/10.1007/s10750-017-3106-6#Fig2)
- Credit: Ian W. Hendy and Simon M. Cragg
- License: CC BY 4.0 ([details](https://creativecommons.org/licenses/by/4.0/))
- Changes: Single photographic panel cropped from the original research figure; JPEG optimized
- Note: Rhizophora stylosa prop roots; Hendy & Cragg (2017), Hydrobiologia, DOI:10.1007/s10750-017-3106-6. Figure 2A: superficial experimental removal of the outer root layer; illustrates some damage, not root looseness.

### v3-dead-root-tissue.jpg

- Source: [original](https://link.springer.com/article/10.1007/s10750-017-3106-6#Fig1)
- Credit: Ian W. Hendy and Simon M. Cragg
- License: CC BY 4.0 ([details](https://creativecommons.org/licenses/by/4.0/))
- Changes: Single photographic panel cropped from the original research figure; JPEG optimized
- Note: Rhizophora stylosa prop roots; Hendy & Cragg (2017), Hydrobiologia, DOI:10.1007/s10750-017-3106-6. Figure 1B: damaged root with wood-borer tunnels; the discussion identifies such root tissue as necrotic or dead.

### v3-rhizophora-leaf-dots.jpg

- Source: [original](https://peerj.com/articles/17460/#fig-9)
- Credit: Chatchai Ngernsaengsaruay; Ngernsaengsaruay et al. (2024), PeerJ 12:e17460
- License: CC BY 4.0 ([details](https://creativecommons.org/licenses/by/4.0/))
- Changes: Single photographic panel (Figure 9F) cropped; JPEG optimized
- Note: Natural cork warts on the underside of a Rhizophora mucronata leaf. These are an identification trait, not evidence of pests or disease.
