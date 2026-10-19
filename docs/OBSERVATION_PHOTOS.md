# Observation choice photographs

The catalog contains 29 individual real photographs and two explicitly labeled AI educational illustrations. No choice uses a collage. Online copies are stored locally so the web and app do not depend on third-party hotlinks. The manifest is `supabase/functions/api/data/observation-photos.json`.

## Interpretation

Photos illustrate visible features; they do not establish health, root firmness, rot, animal absence, or species identity. Use the choice labels and field observations. Not Sure, All of the above, None of the above, and No Animals stay text-only. Naturally exposed breathing/stilt roots are not evidence of erosion; the erosion photo shows a washed-out bank. The looped root photo is explicitly a Bruguiera example, not a Lumnitzera identification. Nypa has a largely underground rhizome, shown in an AI cutaway example. The elliptic leaf with dark dots uses an AI underside example. Both are marked AI illustrations in the web and app. The N/A (palm) bark choice retains the real Nypa palm-base photograph.

## Sources and reuse

For another project, configure the public Supabase client settings and provide the operator credential through `MANGROOVES_SUPABASE_SECRET_KEY` in the local environment. Preview with `node supabase/scripts/install-observation-photos.js --project YOUR_PROJECT_REF`; add `--apply` to install. The installer validates file checksums, backs up reference settings under ignored `tmp/reference-photo-backups`, permits JPEG in the existing reference bucket, uploads missing assets, and fills only missing images whose labels still match. Custom photos and renamed choices are preserved. Repeating it makes no further reference changes. Deploy the API and web source to include credits and AI labels, and rebuild/install Android to update its UI. This does not require running `database/mobile_api.sql`.

CC-licensed crops retain the source license. Each entry links to the original description and license. For real photographs, cropping/resizing are the only changes; no colors, damage, or organisms were added. The supplied CCENRO sheets are project-provided reference material; the original photographer/license was not supplied, so no Creative Commons license is asserted for those crops. Keep this record with redistributed assets.

### v1-green-leaf.jpg

- Source: [File:Grey Mangrove leaf - front.jpg](https://commons.wikimedia.org/wiki/File:Grey_Mangrove_leaf_-_front.jpg)
- Credit: Peripitus
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-yellow-green-leaves.jpg

- Source: [File:Black Mangrove Leaves - Flickr - treegrow.jpg](https://commons.wikimedia.org/wiki/File:Black_Mangrove_Leaves_-_Flickr_-_treegrow.jpg)
- Credit: Katja Schulz from Washington, D. C., USA
- License: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-brown-leaf.jpg

- Source: [File:Mollusc shells on marine beach (Sanibel Inn Beach, Sanibel Island, Florida, USA) 1.jpg](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Fallen brown mangrove leaf; compare the color of leaves still on your tree.

### v1-waxy-upward-leaves.jpg

- User-supplied original: `835357134_1079044618360670_1143296594850569178_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-dry-leaves.jpg

- Source: [File:Avicennia marina ssp. australasica Lord Howe Island.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_marina_ssp._australasica_Lord_Howe_Island.jpg)
- Credit: John Game
- License: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Dried reference specimen. Check whether leaves on the tree are dry or brittle.

### v1-leaf-bites.jpg

- Source: [File:Keeled-pod mangrove (Heritiera littoralis) leaves.jpg](https://commons.wikimedia.org/wiki/File:Keeled-pod_mangrove_(Heritiera_littoralis)_leaves.jpg)
- Credit: David E Mead
- License: [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Chewed leaf edges are visible in this mangrove leaf sample.

### v1-caterpillar-damage.jpg

- Source: [File:Mangrove Skipper (Phocides pigmalion) (11381559594).jpg](https://commons.wikimedia.org/wiki/File:Mangrove_Skipper_(Phocides_pigmalion)_(11381559594).jpg)
- Credit: Bob Peterson from North Palm Beach, Florida, Planet Earth!
- License: [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Caterpillar and extensive feeding damage on a mangrove leaf.

### v1-leaf-dark-spots.jpg

- Source: [File:Lumnitzera racemosa, Black Mangrove W IMG 6941.jpg](https://commons.wikimedia.org/wiki/File:Lumnitzera_racemosa,_Black_Mangrove_W_IMG_6941.jpg)
- Credit: J.M.Garg
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visible holes and damaged edges on Lumnitzera leaves.

### v1-intact-prop-roots.jpg

- Source: [File:Mangroves.jpg](https://commons.wikimedia.org/wiki/File:Mangroves.jpg)
- Credit: Source contributor
- Rights: Public domain
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-uprooted-roots.jpg

- Source: [File:Uprooted Mangrove - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Uprooted_Mangrove_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: An uprooted mangrove; look for loose or damaged roots at your site.

### v1-root-erosion.jpg

- Source: [File:Avicennia marina bare rooted by erosion Nudgee Creek Nudgee Beach Bramble Bay Queensland P1040563.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_marina_bare_rooted_by_erosion_Nudgee_Creek_Nudgee_Beach_Bramble_Bay_Queensland_P1040563.jpg)
- Credit: John Robert McPherson
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-dead-mangrove.jpg

- Source: [File:Old Dead Mangrove w-live one in rear - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Old_Dead_Mangrove_w-live_one_in_rear_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Dead mangrove example. A photo alone cannot confirm root rot.

### v1-smooth-bark.jpg

- User-supplied original: `836742845_1771525323966757_4267915318653616657_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-flaking-bark.jpg

- User-supplied original: `836742845_1771525323966757_4267915318653616657_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-rough-bark.jpg

- User-supplied original: `841207505_2883189508729450_5016555859826843370_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-fissured-bark.jpg

- Source: [File:Black-mangrove-bark (13746385495).gif](https://commons.wikimedia.org/wiki/File:Black-mangrove-bark_(13746385495).gif)
- Credit: Homer Edward Price
- License: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Fissured black-mangrove bark. Natural bark texture alone does not prove damage.

### v1-broken-trunk.jpg

- Source: [File:Old Dead Mangrove w-live one in rear - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Old_Dead_Mangrove_w-live_one_in_rear_-_panoramio.jpg)
- Credit: YourWorldExplorer
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Broken trunk and missing wood on a dead mangrove.

### v1-mudskipper.jpg

- Source: [File:Mudskipper (Oxudercinae), Sungei Buloh Wetland Reserve, Singapore.jpg](https://commons.wikimedia.org/wiki/File:Mudskipper_(Oxudercinae),_Sungei_Buloh_Wetland_Reserve,_Singapore.jpg)
- Credit: Lulumac89 at en.wikipedia.
- Rights: Public domain
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-mangrove-birds.jpg

- Source: [File:Little blue herons on mangrove roots - DPLA - 8783f676f5a0b49ecc4171f5fc106a93.jpg](https://commons.wikimedia.org/wiki/File:Little_blue_herons_on_mangrove_roots_-_DPLA_-_8783f676f5a0b49ecc4171f5fc106a93.jpg)
- Credit: Department of the Interior. U.S. Fish and Wildlife Service. National Conservation Training Center. 10/1997-8888
- Rights: Public domain
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-small-fish.jpg

- Source: [File:Mangrove Mollies (Poecilia orri) feeding on a leaf - Carwash Cenote QR 2020.jpg](https://commons.wikimedia.org/wiki/File:Mangrove_Mollies_(Poecilia_orri)_feeding_on_a_leaf_-_Carwash_Cenote_QR_2020.jpg)
- Credit: Bernard DUPONT
- License: [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-shells.jpg

- Source: [File:Mollusc shells on marine beach (Sanibel Inn Beach, Sanibel Island, Florida, USA) 1.jpg](https://commons.wikimedia.org/wiki/File:Mollusc_shells_on_marine_beach_(Sanibel_Inn_Beach,_Sanibel_Island,_Florida,_USA)_1.jpg)
- Credit: James St. John
- License: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-butterfly.jpg

- Source: [File:Avicennia sp. with Arhopala amantes 03164.jpg](https://commons.wikimedia.org/wiki/File:Avicennia_sp._with_Arhopala_amantes_03164.jpg)
- Credit: Vengolis
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-plastic-litter.jpg

- Source: [File:Charkop Dumping.JPG](https://commons.wikimedia.org/wiki/File:Charkop_Dumping.JPG)
- Credit: DLS
- Rights: Public domain
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-looping-roots.jpg

- Source: [File:Bruguiera gymnorhiza roots.jpg](https://commons.wikimedia.org/wiki/File:Bruguiera_gymnorhiza_roots.jpg)
- Credit: Anonymous Powered
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Looped knee-root example from Bruguiera; use this to compare root form, not identify a species.

### v1-pencil-roots.jpg

- Source: [File:Avicennia sp. DSCN9864 (13).jpg](https://commons.wikimedia.org/wiki/File:Avicennia_sp._DSCN9864_(13).jpg)
- Credit: Dr. Raju Kasambe
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Upright breathing roots (pneumatophores) of Avicennia.

### v1-nypa-base.jpg

- User-supplied original: `837836789_1574159134514868_7924261311556051883_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Nypa palm base. Its creeping rhizome is mostly below ground.

### v1-nypa-leaflets.jpg

- User-supplied original: `837836789_1574159134514868_7924261311556051883_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-obovate-leaves.jpg

- Source: [File:Lumnitzera racemosa (11544407974).jpg](https://commons.wikimedia.org/wiki/File:Lumnitzera_racemosa_(11544407974).jpg)
- Credit: Dinesh Valke from Thane, India
- License: [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)
- Changes: Resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

### v1-brown-bark.jpg

- User-supplied original: `836693553_1513453507257854_2670710336926453175_n.jpg`
- Credit: CCENRO reference sheet
- Rights: Project reference
- Changes: Cropped and resized; crop coordinates are recorded in the manifest.
- Context: Visual example of the corresponding choice.

## AI examples and final prompts

Created with the built-in imagegen tool on 20 October 2026 using the imagegen skill. The generated originals remain in the local Codex image directory; optimized project assets are stored at the paths below. They are illustrative references, not field photographs or diagnostic evidence. No external CLI/API fallback was used.

### img/observations/v1-ai-nypa-rhizome.jpg

Cutaway example: a horizontal underground stem connects the palm shoots; fine roots grow below it.

```text
Use case: scientific-educational. Create ONE photorealistic botanical educational illustration for the observation choice 'Creeping rhizomes' of Nypa fruticans (nipa mangrove palm). A clear side view of a SINGLE horizontal thick brown branching underground palm stem (rhizome), shown in an exposed-soil cutaway on a muddy tropical tidal bank; many thin adventitious roots grow down from its underside, two widely separated tufts of erect long green pinnate palm fronds emerge up from nodes on the same horizontal stem. The rhizome is a horizontal STEM underground, not stilt roots, not pencil roots and not a tall woody trunk. The cutaway exposes the horizontal connection clearly. Natural realistic materials and daylight; close specimen-scale framing makes the rhizome dominate the lower two thirds, fronds can extend beyond the upper crop. Landscape 4:3 composition. ONE scene, no panels, no collage, no text, no labels, no watermark. This is an AI educational illustration, not documentary field evidence; clarity of the horizontal rhizome is essential.
```

### img/observations/v1-ai-elliptic-dots.jpg

Underside example: tiny natural dark dots on an elliptic leaf. These dots are different from large damaged patches.

```text
Use case: scientific-educational. Create ONE photorealistic macro botanical educational illustration for a mangrove identification choice 'Elliptic (with dark dots)'. Show the UNDERSIDE of one mature Rhizophora mucronata leaf, isolated across a softly blurred neutral green outdoor background, the entire blade in sharp focus. The blade is broad elliptic (oval with both ends tapering), leathery, pale yellow-green beneath, a straight central raised pale midrib and delicate secondary veins, a small very short narrow pointed mucronate apex, and a short petiole at the opposite end. Many tiny discrete dark brown pinprick dots are distributed irregularly across the underside surface between the veins; dots are tiny natural punctations, NOT large disease blotches, NOT holes, NOT circular rings or pustules. Leaf is healthy with an unbroken smooth entire margin. No insect damage. Realistic natural light and subtly textured leaf. Landscape 4:3 composition, one leaf only, no montage, no collage, no comparison panels, no text, no watermark. This is a botanical feature illustration; prioritize the elliptic shape and clearly visible fine underside dots.
```
