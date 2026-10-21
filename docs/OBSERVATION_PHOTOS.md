# Observation choice photographs

The current catalog contains **29 individual real photographs**, including 13 optimized images from the user's shared Drive folder. No active checklist or trait mapping uses an AI image or collage. Labels remain on each choice; source and resizing details are in the separate [Photo credits page](../public/assets/observation-photo-credits.html), retained as an attribution resource without a separate navigation tab.

## Matching visible features

Drive photos are used for green leaves, visible leaf spots, prop roots, pencil roots, Nypa rhizomes, elliptic/obovate/lanceolate leaves and the available bark textures. Files were visually inspected. A file named `looping_roots_01.jpg` showed trunk supports rather than clear knee roots, so the existing real Bruguiera knee-root example is retained. Missing leaf colors, damage, fauna, litter and erosion examples keep their real-photo references. Examples illustrate a visible feature; they do not prove species, health, root firmness, absence of pests, or rot. Not Sure, All of the above, None of the above and No Animals remain text-only.

## Sources and installation

The manifest is `supabase/functions/api/data/observation-photos.json`. Shared source: [user's mangrove folder](https://drive.google.com/drive/folders/106kHhvzyzrS1SWEBqPvX0eLe0bpVPuVj). Drive photographs were resized without changing colors, adding features, or removing existing watermarks. No Creative Commons license is asserted for user-supplied images without one. Licensed fallback images retain their attribution and license on the credits page and below.

Preview with `node supabase/scripts/install-observation-photos.js --project YOUR_PROJECT_REF`, with the operator key in `MANGROOVES_SUPABASE_SECRET_KEY`; add `--apply` to install. The installer verifies checksums, backs up reference settings under ignored `tmp/reference-photo-backups`, uploads missing JPEGs and replaces missing or previous packaged default paths. Custom uploads and changed labels are preserved. Scores, option IDs, historical observations and species records are unchanged. Repeated installation is idempotent. Deploy the API and web; rebuild/install Android for its UI changes. Do not rerun `database/mobile_api.sql` for this update.

### v1-yellow-green-leaves.jpg

- Source: [File:Black Mangrove Leaves - Flickr - treegrow.jpg](https://commons.wikimedia.org/wiki/File:Black_Mangrove_Leaves_-_Flickr_-_treegrow.jpg)
- Credit: Katja Schulz from Washington, D. C., USA
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized

### v1-brown-leaf.jpg

- Source: [File:Mollusc shells on marine beach (Sanibel Inn Beach, Sanibel Island, Florida, USA) 1.jpg](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized

### v1-dry-leaves.jpg

- Source: [File:Avicennia marina ssp. australasica Lord Howe Island.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_marina_ssp._australasica_Lord_Howe_Island.jpg)
- Credit: John Game
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Resized

### v1-leaf-bites.jpg

- Source: [File:Keeled-pod mangrove (Heritiera littoralis) leaves.jpg](https://commons.wikimedia.org/wiki/File:Keeled-pod_mangrove_(Heritiera_littoralis)_leaves.jpg)
- Credit: David E Mead
- License: CC0 ([details](https://creativecommons.org/publicdomain/zero/1.0/deed.en))
- Changes: Cropped and resized

### v1-caterpillar-damage.jpg

- Source: [File:Mangrove Skipper (Phocides pigmalion) (11381559594).jpg](https://commons.wikimedia.org/wiki/File:Mangrove_Skipper_(Phocides_pigmalion)_(11381559594).jpg)
- Credit: Bob Peterson from North Palm Beach, Florida, Planet Earth!
- License: CC BY-SA 2.0 ([details](https://creativecommons.org/licenses/by-sa/2.0))
- Changes: Resized

### v1-uprooted-roots.jpg

- Source: [File:Uprooted Mangrove - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Uprooted_Mangrove_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: CC BY 3.0 ([details](https://creativecommons.org/licenses/by/3.0))
- Changes: Resized

### v1-root-erosion.jpg

- Source: [File:Avicennia marina bare rooted by erosion Nudgee Creek Nudgee Beach Bramble Bay Queensland P1040563.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_marina_bare_rooted_by_erosion_Nudgee_Creek_Nudgee_Beach_Bramble_Bay_Queensland_P1040563.jpg)
- Credit: John Robert McPherson
- License: CC BY-SA 4.0 ([details](https://creativecommons.org/licenses/by-sa/4.0))
- Changes: Resized

### v1-dead-mangrove.jpg

- Source: [File:Old Dead Mangrove w-live one in rear - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Old_Dead_Mangrove_w-live_one_in_rear_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: CC BY 3.0 ([details](https://creativecommons.org/licenses/by/3.0))
- Changes: Resized

### v1-broken-trunk.jpg

- Source: [File:Old Dead Mangrove w-live one in rear - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Old_Dead_Mangrove_w-live_one_in_rear_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: CC BY 3.0 ([details](https://creativecommons.org/licenses/by/3.0))
- Changes: Cropped and resized

### v1-mudskipper.jpg

- Source: [File:Mudskipper (Oxudercinae), Sungei Buloh Wetland Reserve, Singapore.jpg](https://commons.wikimedia.org/wiki/File:Mudskipper_(Oxudercinae),_Sungei_Buloh_Wetland_Reserve,_Singapore.jpg)
- Credit: Lulumac89 at en.wikipedia.
- License: Public domain
- Changes: Resized

### v1-mangrove-birds.jpg

- Source: [File:Little blue herons on mangrove roots - DPLA - 8783f676f5a0b49ecc4171f5fc106a93.jpg](https://commons.wikimedia.org/wiki/File:Little_blue_herons_on_mangrove_roots_-_DPLA_-_8783f676f5a0b49ecc4171f5fc106a93.jpg)
- Credit: Department of the Interior. U.S. Fish and Wildlife Service. National Conservation Training Center. 10/1997-8888
- License: Public domain
- Changes: Resized

### v1-small-fish.jpg

- Source: [File:Mangrove Mollies (Poecilia orri) feeding on a leaf - Carwash Cenote QR 2020.jpg](https://commons.wikimedia.org/wiki/File:Mangrove_Mollies_(Poecilia_orri)_feeding_on_a_leaf_-_Carwash_Cenote_QR_2020.jpg)
- Credit: Bernard DUPONT
- License: CC BY-SA 2.0 ([details](https://creativecommons.org/licenses/by-sa/2.0))
- Changes: Resized

### v1-shells.jpg

- Source: [File:Mollusc shells on marine beach (Sanibel Inn Beach, Sanibel Island, Florida, USA) 1.jpg](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: CC BY 2.0 ([details](https://creativecommons.org/licenses/by/2.0))
- Changes: Cropped and resized

### v1-butterfly.jpg

- Source: [File:Avicennia sp. with Arhopala amantes 03164.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_sp._with_Arhopala_amantes_03164.jpg)
- Credit: Vengolis
- License: CC BY-SA 4.0 ([details](https://creativecommons.org/licenses/by-sa/4.0))
- Changes: Resized

### v1-plastic-litter.jpg

- Source: [File:Charkop Dumping.JPG](https://commons.wikimedia.org/wiki/File:Charkop_Dumping.JPG)
- Credit: DLS
- License: Public domain
- Changes: Resized

### v1-looping-roots.jpg

- Source: [File:Bruguiera gymnorhiza roots.jpg](https://commons.wikimedia.org/wiki/File:Bruguiera_gymnorhiza_roots.jpg)
- Credit: Anonymous Powered
- License: CC BY-SA 3.0 ([details](https://creativecommons.org/licenses/by-sa/3.0))
- Changes: Cropped and resized

### v2-drive-avicennia_marina-leaf_01.jpg

- Source: [https://drive.google.com/file/d/1K1q4U1woRq7ru3TSvEnArAf8X-8ymbrO/view](https://drive.google.com/file/d/1K1q4U1woRq7ru3TSvEnArAf8X-8ymbrO/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-rhizophora_stylosa-leaf_01.jpg

- Source: [https://drive.google.com/file/d/1YSiOl9hbPt7OYWRl_917d9ehG-jMDupY/view](https://drive.google.com/file/d/1YSiOl9hbPt7OYWRl_917d9ehG-jMDupY/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-rhizophora_apiculata-leaf_01.jpg

- Source: [https://drive.google.com/file/d/11j6Q97XjVxE9VVoNbvsb5JuxNTG657VI/view](https://drive.google.com/file/d/11j6Q97XjVxE9VVoNbvsb5JuxNTG657VI/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-shared_characteristics-prop_roots_01.jpg

- Source: [https://drive.google.com/file/d/1zTmE5GDOXDjVxdX3eWhCLX4pC45YSInH/view](https://drive.google.com/file/d/1zTmE5GDOXDjVxdX3eWhCLX4pC45YSInH/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-avicennia_marina-bark_01.jpg

- Source: [https://drive.google.com/file/d/1iW_I7oEK9nBSl3oFbfqeT5wdZQCDsuye/view](https://drive.google.com/file/d/1iW_I7oEK9nBSl3oFbfqeT5wdZQCDsuye/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-rhizophora_apiculata-bark_01.jpg

- Source: [https://drive.google.com/file/d/1pJcqmxieII_Epe5U4NSfqydEPSJ8i_CR/view](https://drive.google.com/file/d/1pJcqmxieII_Epe5U4NSfqydEPSJ8i_CR/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-nypa_fruticans-roots_01.jpg

- Source: [https://drive.google.com/file/d/1sS3bYgYkj9OJaZk3bUil9YG76IOdukNB/view](https://drive.google.com/file/d/1sS3bYgYkj9OJaZk3bUil9YG76IOdukNB/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-shared_characteristics-pencil_pneumatophores_01.jpg

- Source: [https://drive.google.com/file/d/1x5Zcw-XD2plBsIAxmYpcB0-03qdjj96h/view](https://drive.google.com/file/d/1x5Zcw-XD2plBsIAxmYpcB0-03qdjj96h/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-rhizophora_mucronata-leaf_01.jpg

- Source: [https://drive.google.com/file/d/1xrLw_6Yal4Uq5ci71-QKpJXw_kpF1yxz/view](https://drive.google.com/file/d/1xrLw_6Yal4Uq5ci71-QKpJXw_kpF1yxz/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-nypa_fruticans-leaf_01.jpg

- Source: [https://drive.google.com/file/d/1911C4Y1mRG9Em_jkOxV2Wd5LcRZyjryZ/view](https://drive.google.com/file/d/1911C4Y1mRG9Em_jkOxV2Wd5LcRZyjryZ/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-lumnitzera_racemosa-leaf_01.jpg

- Source: [https://drive.google.com/file/d/18hoekqtY7yFz1dWW7n-KH-ZJwOgmd7M4/view](https://drive.google.com/file/d/18hoekqtY7yFz1dWW7n-KH-ZJwOgmd7M4/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-lumnitzera_racemosa-bark_01.jpg

- Source: [https://drive.google.com/file/d/1VqcUvOBJUa1n4heBTY_fxfabZc7Wr0RG/view](https://drive.google.com/file/d/1VqcUvOBJUa1n4heBTY_fxfabZc7Wr0RG/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained

### v2-drive-avicennia_rumphiana-bark_01.jpg

- Source: [https://drive.google.com/file/d/1pY1F3dtPsslRa1TrCO2baAfRJ5U2h9No/view](https://drive.google.com/file/d/1pY1F3dtPsslRa1TrCO2baAfRJ5U2h9No/view)
- Credit: Project-supplied Drive collection
- License: Project reference — original rights retained
- Changes: Resized and JPEG optimized; full image retained
