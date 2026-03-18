#!/usr/bin/env node
/**
 * generate-seeds.mjs — Creates 100 brief seed files for the agent pipeline.
 *
 * Usage: node pipelines/generate-seeds.mjs
 *
 * Creates drafts/{pillar}/{slug}.md with status: briefed for each article.
 * Skips files that already exist to avoid overwriting.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '..');

const ARTICLES = [
  // ── LONGEVITY ────────────────────────────────────────────────────────────
  {
    pillar: 'longevity',
    slug: 'rapamycin-longevity-pearl-trial',
    title: 'The Rapamycin Question: What the PEARL Trial Really Tells Us',
    description: 'Rapamycin is the most-debated longevity drug in the field. The PEARL trial gave us the first controlled human data. Here is what it actually shows.',
    tags: ['rapamycin', 'longevity', 'mTOR', 'aging', 'clinical-trials'],
    brief: 'Cover the mechanism of rapamycin (mTOR inhibition), the PEARL trial design and findings, Peter Attia and Matt Kaeberlein\'s views, current clinical use patterns, and the honest risk-benefit framing for healthy adults considering it.',
  },
  {
    pillar: 'longevity',
    slug: 'glp-1-longevity-science',
    title: 'GLP-1s as Longevity Drugs: The Emerging Science Beyond Weight Loss',
    description: 'A 2025 Nature Biotechnology paper proposed GLP-1 receptor agonists as the first true longevity therapeutics. Here is what the science actually shows.',
    tags: ['GLP-1', 'semaglutide', 'longevity', 'inflammation', 'cardiovascular'],
    brief: 'Cover the GLP-1 mechanism, the cardiovascular mortality data (SUSTAIN-6, LEADER, SELECT trials), anti-inflammatory and neuroprotective effects, the Nature Biotechnology 2025 longevity paper, and honest limitations of current evidence.',
  },
  {
    pillar: 'longevity',
    slug: 'metformin-aging-tame-trial',
    title: 'Metformin for Aging: What the TAME Trial Results Mean for Healthy Adults',
    description: 'The TAME trial — Targeting Aging with Metformin — is the first clinical trial designed to treat aging itself. Here is what the data shows and what it means for healthy people.',
    tags: ['metformin', 'TAME-trial', 'aging', 'AMPK', 'longevity'],
    brief: 'Cover AMPK activation mechanism, the TAME trial design (Nir Barzilai), preliminary findings, difference between diabetic and non-diabetic populations, and the honest case for and against healthy adults taking metformin.',
  },
  {
    pillar: 'longevity',
    slug: 'biological-age-testing-guide',
    title: 'Biological Age Testing: How to Interpret Your Epigenetic Clock Score',
    description: 'Consumer epigenetic age tests are now widely available. Here is a practical guide to what they measure, which tests are worth using, and what your score actually means.',
    tags: ['biological-age', 'epigenetic-clocks', 'TruAge', 'Horvath-clock', 'longevity'],
    brief: 'Cover the difference between chronological and biological age, the main clocks (Horvath, Hannum, DunedinPACE, GrimAge), consumer tests like TruAge and Elysium Index, what a 5-year acceleration means in practice, and the limitations of current tests.',
  },
  {
    pillar: 'longevity',
    slug: 'dexa-scan-body-composition-longevity',
    title: 'DEXA Scans: Why Body Composition Beats BMI as a Longevity Marker',
    description: 'BMI tells you almost nothing about your true metabolic health. DEXA scans reveal what actually matters — lean mass, visceral fat, and bone density — and each predicts longevity independently.',
    tags: ['DEXA', 'body-composition', 'BMI', 'lean-mass', 'longevity'],
    brief: 'Cover the limitations of BMI, what DEXA measures (lean mass, fat mass, bone density, visceral fat), the specific longevity research linking each component to mortality, how to access and interpret a DEXA scan, and target ranges by age and sex.',
  },
  {
    pillar: 'longevity',
    slug: 'apob-cardiovascular-risk-longevity',
    title: 'ApoB: The Cardiovascular Biomarker Your Doctor Probably Isn\'t Testing',
    description: 'ApoB — apolipoprotein B — is a more accurate predictor of cardiovascular risk than LDL cholesterol. Here is what it measures, why it matters, and how to get it tested.',
    tags: ['ApoB', 'cardiovascular', 'LDL', 'biomarkers', 'longevity'],
    brief: 'Explain what ApoB is and why it is more predictive than LDL-C, the studies linking ApoB to ASCVD risk, Peter Attia\'s framework for target ranges, how to get tested, and what interventions actually lower ApoB.',
  },
  {
    pillar: 'longevity',
    slug: 'senomorphics-sasp-aging',
    title: 'Senomorphics: Suppressing Zombie Cell Secretions Without Killing Them',
    description: 'Senolytics kill senescent cells. Senomorphics take a different approach — suppressing the inflammatory signals zombie cells emit. Here is the emerging science.',
    tags: ['senomorphics', 'senolytics', 'SASP', 'senescent-cells', 'aging'],
    brief: 'Explain the distinction between senolytics and senomorphics, what SASP (senescence-associated secretory phenotype) is and why it drives inflammaging, current senomorphic candidates (rapamycin as SASP suppressor, JAK inhibitors, navitoclax), and where the research stands.',
  },
  {
    pillar: 'longevity',
    slug: 'longevity-polypharmacy-drug-stacking',
    title: 'Longevity Drug Stacking: Should You Combine Rapamycin, Metformin, and Acarbose?',
    description: 'The Interventions Testing Program found that combining rapamycin, metformin, and acarbose extended mouse lifespan by up to 30%. What does that mean for humans?',
    tags: ['rapamycin', 'metformin', 'acarbose', 'ITP', 'polypharmacy'],
    brief: 'Cover the ITP combination findings (rapamycin + trametinib, rapamycin + acarbose), the logic of stacking drugs with complementary mechanisms (mTOR + AMPK + glucose metabolism), what the human evidence looks like, and the honest risks of polypharmacy.',
  },
  {
    pillar: 'longevity',
    slug: 'ovarian-aging-womens-longevity',
    title: 'Ovarian Aging: Why Women\'s Longevity Needs Its Own Framework',
    description: 'Most longevity research was done on men or male animals. The ovary is a central driver of women\'s healthspan — and its accelerated aging timeline changes everything.',
    tags: ['ovarian-aging', 'womens-longevity', 'menopause', 'estrogen', 'healthspan'],
    brief: 'Cover why ovarian aging precedes general aging by 10+ years, the role of declining estrogen across all organ systems (brain, bone, cardiovascular, metabolic), why women\'s longevity trajectories diverge from men\'s at menopause, and the emerging clinical frameworks for addressing ovarian aging proactively.',
  },
  {
    pillar: 'longevity',
    slug: 'cardiovascular-risk-women-sex-differences',
    title: 'Cardiovascular Risk in Women: Why Tests Designed for Men Are Failing You',
    description: 'Women present heart disease differently, have different risk factors, and are systematically under-tested and under-treated. Here is what the research shows and what to do about it.',
    tags: ['cardiovascular', 'women', 'sex-differences', 'heart-disease', 'longevity'],
    brief: 'Cover the history of sex bias in cardiovascular research, how women\'s symptoms differ, why standard risk calculators underestimate women\'s risk, the role of pregnancy complications as risk markers, the importance of CAC scoring in women, and specific tests women should ask for.',
  },
  {
    pillar: 'longevity',
    slug: 'advanced-biomarker-panel-longevity',
    title: 'The Expanded Biomarker Panel: 20 Blood Tests Worth Asking For',
    description: 'Standard annual bloodwork misses most of what predicts long-term health. Here is a complete guide to the expanded biomarker panel that longevity medicine uses.',
    tags: ['biomarkers', 'blood-tests', 'longevity', 'preventive-medicine', 'diagnostics'],
    brief: 'Cover the 20 key biomarkers beyond standard panels: ApoB, Lp(a), hsCRP, homocysteine, fasting insulin, HbA1c, fasting glucose, uric acid, GGT, albumin, testosterone (total + free), SHBG, IGF-1, DHEA-S, TSH/T3/T4, ferritin, 25-OH vitamin D, omega-3 index, and epigenetic age. Include reference ranges and what each predicts.',
  },
  {
    pillar: 'longevity',
    slug: 'centenarian-studies-beyond-blue-zones',
    title: 'What Centenarian Studies Tell Us That Blue Zones Research Missed',
    description: 'Blue Zones research gave us lifestyle heuristics. Centenarian genomics and cohort studies are giving us something more specific — and sometimes contradictory.',
    tags: ['centenarians', 'SuperAgers', 'NECS', 'genetics', 'longevity'],
    brief: 'Cover the New England Centenarian Study, the 90+ Study, the CALERIE trial, what genetics vs. lifestyle contributes to exceptional longevity, the specific variants (APOE2, FOXO3A) associated with centenarians, and what we can learn that Blue Zones didn\'t capture.',
  },
  {
    pillar: 'longevity',
    slug: 'mtor-ampk-cellular-longevity',
    title: 'mTOR vs. AMPK: The Cellular Seesaw at the Heart of Longevity',
    description: 'mTOR drives growth. AMPK drives repair. They are in constant opposition — and which one dominates determines how you age at the cellular level.',
    tags: ['mTOR', 'AMPK', 'autophagy', 'longevity', 'cellular-biology'],
    brief: 'Explain the mTOR and AMPK pathways, why they are inversely related, what activates and inhibits each (food, fasting, exercise, rapamycin, metformin), the role of autophagy in this balance, and how to practically influence this seesaw through lifestyle.',
  },
  {
    pillar: 'longevity',
    slug: 'inflammation-biomarkers-crp-il6',
    title: 'Inflammation Biomarkers: CRP, IL-6, and the Tests That Reveal Silent Inflammaging',
    description: 'Low-grade chronic inflammation is now considered a primary driver of aging and age-related disease. Here are the specific biomarkers that measure it — and what to do about elevated levels.',
    tags: ['CRP', 'IL-6', 'inflammaging', 'biomarkers', 'inflammation'],
    brief: 'Explain the inflammaging concept, cover hsCRP (high-sensitivity CRP), IL-6, TNF-alpha, fibrinogen, ferritin, and white blood cell count as inflammatory markers, what ranges indicate risk, what lifestyle and dietary interventions measurably reduce them, and when pharmaceutical intervention is warranted.',
  },
  {
    pillar: 'longevity',
    slug: 'brain-longevity-dementia-prevention-window',
    title: 'The 10-Year Window When Lifestyle Changes Matter Most for Dementia Prevention',
    description: 'Alzheimer\'s disease begins decades before symptoms. The 10 years between 45 and 55 appear to be the most critical window for lifestyle-based prevention. Here is the evidence.',
    tags: ['dementia', 'Alzheimer', 'brain-longevity', 'prevention', 'cognitive-health'],
    brief: 'Cover the Lancet Commission\'s 14 modifiable risk factors for dementia, why the midlife window (45-55) is critical, the role of sleep, vascular health, hearing loss, social connection, and physical activity, the estrogen-dementia connection for women (NBC News 2025), and evidence-based prevention protocols.',
  },
  {
    pillar: 'longevity',
    slug: 'spermidine-autophagy-longevity',
    title: 'Spermidine: The Autophagy-Boosting Compound Found in Wheat Germ and Aged Cheese',
    description: 'Spermidine is a naturally occurring polyamine that triggers autophagy — the cellular cleanup process that declines with age. Here is what the research shows.',
    tags: ['spermidine', 'autophagy', 'polyamines', 'longevity', 'cellular-health'],
    brief: 'Explain what spermidine is, how it triggers autophagy (the TFEB pathway), Frank Madeo\'s lab research, the observational human data linking dietary spermidine to longevity, food sources (wheat germ, natto, aged cheese), supplementation evidence, and honest caveats.',
  },
  {
    pillar: 'longevity',
    slug: 'superagers-brain-longevity-science',
    title: 'SuperAgers: Why Some 80-Year-Olds Have the Brains of 50-Year-Olds',
    description: 'Northwestern\'s SuperAger project has been studying people over 80 with 50-year-old cognitive performance for over a decade. Here is what makes them different.',
    tags: ['SuperAgers', 'cognitive-aging', 'brain-longevity', 'Northwestern', 'memory'],
    brief: 'Cover the Northwestern SuperAger cohort definition and study design, what brain imaging reveals (thicker cortex, larger neurons), the behavioral and lifestyle factors distinguishing SuperAgers, the role of von Economo neurons, and what we can learn that is practically applicable.',
  },
  {
    pillar: 'longevity',
    slug: 'cardiovascular-age-measurement',
    title: 'Cardiovascular Age vs. Chronological Age: How to Measure and Improve It',
    description: 'Your heart and arteries may be aging faster or slower than your birth certificate suggests. Here is how to measure your cardiovascular age and what to do with the number.',
    tags: ['cardiovascular-age', 'CAC-score', 'arterial-stiffness', 'heart-health', 'longevity'],
    brief: 'Cover coronary artery calcium (CAC) scoring, pulse wave velocity (arterial stiffness), hs-troponin, heart rate variability, and VO2 max as measures of cardiovascular age. Include target ranges, what each predicts for mortality, and the specific interventions that measurably improve cardiovascular age.',
  },
  {
    pillar: 'longevity',
    slug: 'longevity-medicine-clinics-guide',
    title: 'Longevity Medicine Clinics: What to Expect, What to Ask, What to Skip',
    description: 'Longevity clinics are now in every major city. Some offer genuine clinical value. Others are expensive wellness spas with a veneer of science. Here is how to tell the difference.',
    tags: ['longevity-clinics', 'preventive-medicine', 'diagnostics', 'functional-medicine'],
    brief: 'Cover what legitimate longevity medicine clinics actually offer (advanced diagnostics, hormone optimisation, personalised prevention), the red flags of wellness-washed clinics, the specific tests and panels worth paying for, the ones that are not, and how to evaluate a clinic before committing.',
  },
  {
    pillar: 'longevity',
    slug: 'spinal-health-posture-longevity',
    title: 'Spinal Health and Longevity: Why Your Back\'s Structural Integrity Determines Your Healthspan',
    description: 'Spinal degeneration is one of the most common causes of disability and loss of independence as we age — yet it receives almost no attention in longevity medicine. Here is what to know.',
    tags: ['spinal-health', 'posture', 'disc-degeneration', 'longevity', 'mobility'],
    brief: 'Cover the epidemiology of spinal degeneration, the relationship between spinal cord reserve and neurological resilience, the specific exercises that preserve disc health and spinal stability, the role of posture and movement patterns, and what the evidence says about reversing early degeneration.',
  },

  // ── SLEEP ─────────────────────────────────────────────────────────────────
  {
    pillar: 'sleep',
    slug: 'mouth-taping-sleep-evidence',
    title: 'Mouth Taping for Sleep: Separating Viral Hype From the Clinical Evidence',
    description: 'Mouth taping has millions of social media posts and a growing number of advocates. A 2025 systematic review finally gave us real data. Here is an honest assessment.',
    tags: ['mouth-taping', 'sleep', 'nasal-breathing', 'sleep-quality'],
    brief: 'Cover the physiology of nasal vs. mouth breathing during sleep, the 2025 systematic review findings, who may genuinely benefit (mild sleep-disordered breathing), who should not use it (moderate-severe sleep apnea), the safety considerations, and practical guidance.',
  },
  {
    pillar: 'sleep',
    slug: 'nasal-breathing-sleep-physiology',
    title: 'Nasal Breathing While You Sleep: The Physiology Behind a Better Night',
    description: 'The nose is not just a filter — it is a sleep-optimisation system. Nasal breathing during sleep produces nitric oxide, supports oxygen uptake, and protects against arousal. Here is the science.',
    tags: ['nasal-breathing', 'nitric-oxide', 'sleep', 'sleep-apnea'],
    brief: 'Cover the physiology of nasal breathing (nitric oxide production, turbinate function, air humidification), the sleep-specific benefits (reduced arousal threshold, better oxygen saturation), comparison to mouth breathing during sleep, James Nestor\'s research, and practical approaches to improve nasal breathing.',
  },
  {
    pillar: 'sleep',
    slug: 'hrv-sleep-measurement-guide',
    title: 'Heart Rate Variability During Sleep: What Your Wearable Is Actually Measuring',
    description: 'HRV is the most-watched metric on sleep wearables — and the least understood. Here is what it actually measures, what a good number looks like, and what you can do about a low score.',
    tags: ['HRV', 'heart-rate-variability', 'sleep', 'wearables', 'recovery'],
    brief: 'Explain what HRV measures (autonomic nervous system balance), why it peaks during sleep, what factors supppress it (alcohol, stress, illness, poor sleep), how different wearables measure it (Oura, Garmin, Apple Watch accuracy), what constitutes a meaningful change, and evidence-based interventions that improve HRV.',
  },
  {
    pillar: 'sleep',
    slug: 'temperature-sleep-core-cooling',
    title: 'Temperature and Sleep: The Science of Keeping Your Core Cool for Deeper Rest',
    description: 'Core body temperature must drop 1–2°C to initiate and maintain deep sleep. Most people\'s bedrooms are too warm. Here is the science and the protocol.',
    tags: ['sleep-temperature', 'core-cooling', 'deep-sleep', 'sleep-environment'],
    brief: 'Cover the thermoregulatory basis of sleep initiation (core temperature drop), the optimal bedroom temperature range (16–19°C), the role of peripheral vasodilation, evidence for cooling mattress pads (Eight Sleep, ChiliPad trials), warm bath before bed paradox, and practical environment optimisation.',
  },
  {
    pillar: 'sleep',
    slug: 'perimenopause-sleep-disruption-solutions',
    title: 'How Perimenopause Destroys Sleep — and Evidence-Based Ways to Fix It',
    description: 'Hot flashes, night sweats, anxiety, and shifting sleep architecture make perimenopause one of the most severe sleep disruptors women experience. Here is what the evidence says about fixing it.',
    tags: ['perimenopause', 'sleep', 'hot-flashes', 'night-sweats', 'HRT'],
    brief: 'Cover the hormonal mechanisms driving perimenopause sleep disruption (progesterone loss, estrogen fluctuation), how sleep architecture changes, the evidence for HRT as the most effective intervention, non-hormonal options (fezolinetant, CBT-I, cooling), and a practical stepped protocol for women navigating this transition.',
  },
  {
    pillar: 'sleep',
    slug: 'sleep-immune-system-vaccine-response',
    title: 'The Sleep-Immune Axis: Why Poor Sleep Makes Every Vaccine Less Effective',
    description: 'Sleep is not passive recovery — it is an active immune function. Studies show that sleeping less than 6 hours the week before vaccination can cut antibody response by half.',
    tags: ['sleep', 'immune-system', 'vaccines', 'cytokines', 'immune-function'],
    brief: 'Cover the sleep-immune axis (cytokine release, T-cell activation during sleep), the Cohen & Akerstedt hepatitis B and influenza vaccination studies, what this means for general immune resilience beyond vaccination, and the specific sleep optimisation protocol that maximises immune function.',
  },
  {
    pillar: 'sleep',
    slug: 'adenosine-sleep-pressure-neuroscience',
    title: 'Adenosine and Sleep Pressure: The Neuroscience of Why You Need to Feel Tired',
    description: 'Sleep pressure — the drive to sleep — is controlled by adenosine buildup in the brain. Understanding this system explains why naps, caffeine, and sleep deprivation work the way they do.',
    tags: ['adenosine', 'sleep-pressure', 'sleep-drive', 'neuroscience', 'caffeine'],
    brief: 'Explain the adenosine system (Process S), how adenosine accumulates during waking, how caffeine blocks adenosine receptors (creating a debt that hits later), how naps partially discharge sleep pressure, the interaction with the circadian system (Process C), and what this means for sleep optimisation.',
  },
  {
    pillar: 'sleep',
    slug: 'alcohol-rem-sleep-suppression',
    title: 'Why Even One Drink Suppresses REM and Slow-Wave Sleep',
    description: 'Alcohol is one of the most potent suppressors of restorative sleep stages. Even moderate drinking causes measurable changes to sleep architecture that persist into the following day.',
    tags: ['alcohol', 'REM-sleep', 'slow-wave-sleep', 'sleep-architecture', 'recovery'],
    brief: 'Cover how alcohol disrupts sleep architecture (initial sedation, then REM rebound), the dose-response relationship, the evidence from Oura and WHOOP wearable studies, why even 1-2 drinks measurably impair deep sleep, the recovery timeline, and practical guidance for those who drink.',
  },
  {
    pillar: 'sleep',
    slug: 'cbti-vs-sleep-medication-comparison',
    title: 'CBT-I vs. Sleep Medication: A Head-to-Head Comparison for Chronic Insomnia',
    description: 'CBT-I is recommended as the first-line treatment for chronic insomnia. Sleep medications remain the most commonly prescribed. Here is what the evidence actually shows for each.',
    tags: ['CBT-I', 'insomnia', 'sleep-medication', 'zolpidem', 'cognitive-behavioral-therapy'],
    brief: 'Compare CBT-I (stimulus control, sleep restriction, sleep hygiene, cognitive restructuring) vs. Z-drugs (zolpidem, eszopiclone), benzodiazepines, and newer agents (suvorexant, lemborexant). Cover efficacy data, relapse rates, dependency risk, who each is appropriate for, and the evidence for combination approaches.',
  },
  {
    pillar: 'sleep',
    slug: 'gut-microbiome-sleep-circadian',
    title: 'The Gut-Sleep Connection: How Your Microbiome Influences Your Circadian Clock',
    description: 'The gut microbiome has its own circadian rhythm — and disrupting one disrupts the other. Here is the emerging science connecting your gut bacteria to your sleep quality.',
    tags: ['microbiome', 'sleep', 'circadian-rhythm', 'gut-health', 'serotonin'],
    brief: 'Cover the gut microbiome\'s circadian oscillation, the gut-brain axis in sleep regulation (90% of serotonin made in the gut), how gut dysbiosis disrupts sleep, the evidence linking specific microbiome profiles to better sleep, and dietary and lifestyle interventions that improve both microbiome health and sleep quality.',
  },
  {
    pillar: 'sleep',
    slug: 'jet-lag-recovery-protocol',
    title: 'Jet Lag Recovery: The Evidence-Based Protocol to Reset Your Clock Fast',
    description: 'Jet lag is a circadian disruption, not just tiredness. Resetting it quickly requires targeting the right biological levers at the right times. Here is the protocol.',
    tags: ['jet-lag', 'circadian-rhythm', 'travel', 'melatonin', 'light-therapy'],
    brief: 'Cover the circadian biology of jet lag, eastward vs. westward travel differences, the evidence for melatonin (dose and timing), strategic light exposure, fasting and meal timing protocols (Argonne diet, Harvard light-avoidance protocols), caffeine timing, and a practical day-by-day reset plan.',
  },
  {
    pillar: 'sleep',
    slug: 'menstrual-cycle-sleep-architecture',
    title: 'How the Menstrual Cycle Changes Sleep Stage Distribution',
    description: 'Sleep changes measurably across the menstrual cycle — in architecture, depth, and quality. Most women don\'t know this, and most sleep advice ignores it.',
    tags: ['menstrual-cycle', 'sleep', 'progesterone', 'REM-sleep', 'womens-health'],
    brief: 'Cover how progesterone (thermogenic, respiratory stimulant) and estrogen affect sleep across cycle phases, why the luteal phase brings worse sleep and more awakenings, the documented changes in slow-wave and REM distribution, what this means for wearable data interpretation, and cycle-informed sleep strategies.',
  },
  {
    pillar: 'sleep',
    slug: 'sleep-debt-recovery-science',
    title: 'Sleep Debt: Is It Real, and Can You Pay It Back on Weekends?',
    description: 'Sleep debt is real — cognitively, metabolically, and immunologically. Weekend recovery sleep partially compensates. Here is what the research actually shows.',
    tags: ['sleep-debt', 'sleep-deprivation', 'recovery-sleep', 'chronic-sleep-loss'],
    brief: 'Cover the neuroscience of sleep debt (homeostatic pressure accumulation), Van Dongen\'s 14-day sleep restriction studies, the evidence for and against recovery sleep on weekends, what never fully recovers (cognitive performance, metabolic markers), and the minimum nightly sleep target to avoid accumulating debt.',
  },
  {
    pillar: 'sleep',
    slug: 'tryptophan-serotonin-melatonin-sleep',
    title: 'Tryptophan, Serotonin, and Melatonin: The Nutritional Pathway to Better Sleep',
    description: 'The amino acid tryptophan is the raw material for both serotonin and melatonin. Dietary choices can meaningfully influence this pathway — and your sleep quality.',
    tags: ['tryptophan', 'serotonin', 'melatonin', 'sleep', 'nutrition'],
    brief: 'Cover the tryptophan-serotonin-melatonin biosynthetic pathway, which foods are the best tryptophan sources, how carbohydrate intake facilitates tryptophan transport across the blood-brain barrier (the carb-protein ratio timing), the evidence for tart cherry juice (natural melatonin source), and the limits of dietary approaches vs. supplementation.',
  },
  {
    pillar: 'sleep',
    slug: 'strength-training-sleep-quality-timing',
    title: 'How Strength Training Improves Sleep Quality — and the Optimal Timing to Lift',
    description: 'Resistance training is one of the most consistent lifestyle interventions for improving sleep depth and duration. But timing matters. Here is what the research shows.',
    tags: ['strength-training', 'sleep', 'exercise-timing', 'deep-sleep', 'recovery'],
    brief: 'Cover the mechanisms linking resistance training to improved sleep (adenosine, GH release, thermoregulatory response), the meta-analyses on sleep architecture improvements, the long-standing advice against evening exercise (and why recent data challenges it), individual chronotype differences, and practical timing guidance.',
  },
  {
    pillar: 'sleep',
    slug: 'sleep-cardiovascular-resting-heart-rate',
    title: 'Sleep and Cardiovascular Health: What Your Overnight Heart Rate Reveals',
    description: 'Your resting heart rate during sleep is one of the most sensitive indicators of cardiovascular health and recovery. Here is how to use it and what it means.',
    tags: ['resting-heart-rate', 'sleep', 'cardiovascular', 'wearables', 'recovery'],
    brief: 'Cover what resting heart rate during sleep reflects (parasympathetic tone, cardiovascular efficiency), what a healthy range looks like by age and fitness level, what elevated overnight HR indicates (overtraining, alcohol, illness, stress), wearable accuracy comparisons, and evidence-based interventions to lower resting HR.',
  },

  // ── NUTRITION ─────────────────────────────────────────────────────────────
  {
    pillar: 'nutrition',
    slug: 'seed-oil-debate-linoleic-acid-evidence',
    title: 'The Seed Oil Debate: What the Evidence Actually Says About Linoleic Acid',
    description: 'Seed oils have become the most contentious topic in nutrition. Some say they drive inflammation and disease. Others say the evidence shows no harm. Here is an honest look at both sides.',
    tags: ['seed-oils', 'linoleic-acid', 'omega-6', 'inflammation', 'nutrition'],
    brief: 'Cover what seed oils are and their omega-6 content, the mechanistic hypothesis (linoleic acid → arachidonic acid → inflammation), the epidemiological and RCT evidence (both supporting and contradicting the inflammatory hypothesis), the substitution effect (what people eat instead), the Minnesota Coronary Experiment, and a practical, honest conclusion.',
  },
  {
    pillar: 'nutrition',
    slug: 'creatine-women-benefits',
    title: 'Creatine for Women: Brain, Bone, and Muscle Benefits Beyond the Gym',
    description: 'Creatine is the most-studied sports supplement in history — and most of that research was done on men. The emerging women-specific data shows benefits that go far beyond muscle.',
    tags: ['creatine', 'women', 'brain-health', 'bone-density', 'supplementation'],
    brief: 'Cover creatine\'s mechanism (phosphocreatine system), the muscle and strength evidence in women (noting hormonal cycle interactions), the brain energy data (promising for perimenopause cognitive symptoms), bone density findings, mood and depression evidence, dosing for women, and safety during pregnancy (current evidence gaps).',
  },
  {
    pillar: 'nutrition',
    slug: 'protein-distribution-timing-muscle',
    title: 'Protein Distribution: Why When You Eat Protein Matters as Much as How Much',
    description: 'Total protein intake is only part of the equation. How you distribute protein across meals — particularly hitting the leucine threshold at each sitting — may be equally important for muscle preservation.',
    tags: ['protein', 'protein-timing', 'muscle-protein-synthesis', 'leucine', 'anabolic-window'],
    brief: 'Cover the leucine threshold concept (2.5–3g leucine per meal for maximal MPS), why spreading protein evenly outperforms front- or back-loading, the evidence from Paddon-Jones, Trommelen, and Churchward-Venne, practical application for older adults at greater risk of sarcopenia, and the pre-sleep protein evidence.',
  },
  {
    pillar: 'nutrition',
    slug: 'collagen-peptides-evidence-review',
    title: 'Collagen Peptides: The Evidence for Skin, Joints, and Gut',
    description: 'Collagen supplements are one of the fastest-growing nutrition categories. Some evidence supports specific benefits. Much of the marketing goes further than the science. Here is an honest review.',
    tags: ['collagen', 'collagen-peptides', 'skin-aging', 'joints', 'gut-health'],
    brief: 'Cover what collagen peptides are and how they are absorbed, the skin elasticity and hydration evidence (strongest data), the joint health data (particularly TYPE II for OA), the gut lining hypothesis (weaker evidence), what to look for in a product, the role of vitamin C co-ingestion, and comparative value vs. adequate dietary protein.',
  },
  {
    pillar: 'nutrition',
    slug: 'dietary-guidelines-2025-2030-changes',
    title: 'The New Dietary Guidelines 2025–2030: What Changed and What It Means for You',
    description: 'The USDA released updated Dietary Guidelines in January 2026. They shifted meaningfully on protein, ultra-processed foods, and saturated fat. Here is what actually changed and why it matters.',
    tags: ['dietary-guidelines', 'USDA', 'nutrition-policy', 'protein', 'ultra-processed-foods'],
    brief: 'Cover the key changes in the 2025-2030 guidelines vs. 2020-2025: increased protein emphasis, refined stance on saturated fat, the new ultra-processed food language, sugar reduction targets, and the acknowledgment of food pattern approaches beyond MyPlate. Include context on how guidelines are made and their limitations.',
  },
  {
    pillar: 'nutrition',
    slug: 'leucine-threshold-muscle-protein-synthesis',
    title: 'Leucine Threshold: The Minimum Dose of Protein That Triggers Muscle Synthesis',
    description: 'Muscle protein synthesis requires a leucine threshold — a minimum dose of this amino acid that acts like a metabolic switch. Here is what that means in practice.',
    tags: ['leucine', 'muscle-protein-synthesis', 'protein', 'anabolism', 'sarcopenia'],
    brief: 'Explain the leucine threshold concept mechanistically (mTORC1 activation via leucine sensors), the ~2.5–3g leucine dose required, which protein sources hit this per serving, why this matters more in older adults (anabolic resistance), practical meal construction to ensure threshold is hit, and the implications for plant-based eaters.',
  },
  {
    pillar: 'nutrition',
    slug: 'lions-mane-brain-health-evidence',
    title: 'Lion\'s Mane: What Human Trials Actually Show for Brain Health',
    description: 'Lion\'s mane mushroom is the top functional ingredient for brain health in 2025–2026. Most coverage overstates the evidence. Here is what the human trials actually show.',
    tags: ['lions-mane', 'Hericium-erinaceus', 'NGF', 'brain-health', 'cognitive-function'],
    brief: 'Cover the active compounds (hericenones, erinacines) and their NGF (nerve growth factor) stimulating mechanism, the human trial evidence (Mori 2009 MCI study, 2023 young adult RCT, Saitsu 2019 study), the honest limitations (small samples, short duration), what dosing and form the evidence supports, and quality considerations.',
  },
  {
    pillar: 'nutrition',
    slug: 'cgm-non-diabetic-blood-sugar-monitoring',
    title: 'Continuous Glucose Monitors for Non-Diabetics: Are They Worth the Hype?',
    description: 'CGMs are being marketed to healthy people as a metabolic optimisation tool. The evidence for their utility in non-diabetics is more nuanced than the biohacking community admits.',
    tags: ['CGM', 'glucose-monitoring', 'metabolic-health', 'blood-sugar', 'biohacking'],
    brief: 'Cover what CGMs measure and their accuracy in non-diabetic ranges, what normal glycemic variability looks like, the evidence for their utility in non-diabetics (Daubenmier 2020, Hall 2018 PREDICT study), what glucose spikes in healthy people actually mean, the psychological risk of CGM anxiety, and who genuinely benefits.',
  },
  {
    pillar: 'nutrition',
    slug: 'electrolytes-balance-guide',
    title: 'Electrolytes: Why Sodium, Potassium, and Magnesium Balance Matters More Than You Think',
    description: 'The electrolyte supplement market has exploded. Some of the marketing is legitimate. Here is the physiology and practical guidance behind sodium, potassium, and magnesium balance.',
    tags: ['electrolytes', 'sodium', 'potassium', 'magnesium', 'hydration'],
    brief: 'Cover the physiological roles of sodium, potassium, magnesium, and chloride, why modern diets are typically low in potassium and magnesium, the exercise-specific electrolyte loss data (sweat rate, sodium concentration), who actually needs electrolyte supplementation, and what the evidence shows about products like LMNT and Liquid IV.',
  },
  {
    pillar: 'nutrition',
    slug: 'anti-inflammatory-diet-practical-guide',
    title: 'The Anti-Inflammatory Diet: A Practical Evidence-Based Template',
    description: 'The Mediterranean diet is often called anti-inflammatory, but several dietary patterns show strong anti-inflammatory effects. Here is a comprehensive, evidence-based practical guide.',
    tags: ['anti-inflammatory', 'diet', 'inflammation', 'CRP', 'nutrition'],
    brief: 'Cover the foods with the strongest anti-inflammatory evidence (fatty fish, leafy greens, berries, olive oil, turmeric + black pepper, nuts, flaxseed), the pro-inflammatory foods to reduce (refined carbs, seed oils in excess, processed meat, added sugar), the evidence for specific dietary scores (EDII, DICI), and a practical weekly template.',
  },
  {
    pillar: 'nutrition',
    slug: 'resistant-starch-gut-health-guide',
    title: 'Resistant Starch: The Overlooked Fiber That Feeds Your Gut Differently',
    description: 'Resistant starch escapes digestion in the small intestine and feeds specific beneficial bacteria in the colon. It is one of the most clinically supported prebiotic fibers — and most people eat almost none.',
    tags: ['resistant-starch', 'prebiotic', 'gut-health', 'microbiome', 'fiber'],
    brief: 'Cover the four types of resistant starch (RS1-RS4), the mechanism (SCFA production, butyrate specifically), the microbiome strains it selectively feeds, the metabolic health benefits (insulin sensitivity, satiety), the cooking and cooling method for increasing RS content in foods, and practical dosing guidance.',
  },
  {
    pillar: 'nutrition',
    slug: 'red-meat-longevity-evidence-review',
    title: 'The Truth About Red Meat and Longevity: Sorting Signal From Noise',
    description: 'Red meat is both newly endorsed by the 2025 Dietary Guidelines and associated with colorectal cancer in epidemiological studies. A fair reading of all the evidence is needed.',
    tags: ['red-meat', 'longevity', 'colorectal-cancer', 'saturated-fat', 'nutrition'],
    brief: 'Cover the epidemiological evidence (processed vs. unprocessed distinction, EPIC-Oxford, NutriNet), the mechanistic concerns (TMAO, heme iron, cooking methods), the confounding problems in nutrition epidemiology, the new Dietary Guidelines\'s pro-protein shift, the specific types and amounts where risk signals are strongest, and a practical, nuanced conclusion.',
  },
  {
    pillar: 'nutrition',
    slug: 'vitamin-k2-bone-heart-health',
    title: 'Vitamin K2: The Underrated Nutrient That Partners with D for Bone and Heart Health',
    description: 'Vitamin D gets all the attention, but K2 is what directs calcium to your bones and keeps it out of your arteries. Here is what the evidence shows.',
    tags: ['vitamin-K2', 'bone-health', 'cardiovascular', 'calcium', 'MK-7'],
    brief: 'Cover the difference between K1 and K2 (MK-4 vs MK-7), osteocalcin and matrix Gla protein activation, the Rotterdam Study and cardiovascular evidence, the synergy with vitamin D and calcium, food sources (natto, aged cheese, fermented foods), supplementation evidence and optimal forms/doses.',
  },
  {
    pillar: 'nutrition',
    slug: 'personalised-nutrition-genetics-microbiome',
    title: 'Personalised Nutrition: What Your Genetics, Microbiome, and CGM Actually Tell You',
    description: 'Personalised nutrition is the future of dietary guidance. But the consumer tools available today have significant limitations. Here is an honest assessment of what they can and cannot tell you.',
    tags: ['personalised-nutrition', 'nutrigenomics', 'microbiome-testing', 'CGM', 'precision-nutrition'],
    brief: 'Cover the science behind personalised nutrition (the Weizmann Institute PREDICT study, Zeevi 2015 glucose response study), what DNA nutrition tests can and cannot tell you, the state of microbiome-based dietary guidance, CGM utility, and a practical framework for using these tools without over-interpreting them.',
  },
  {
    pillar: 'nutrition',
    slug: 'fermented-foods-vs-probiotic-supplements',
    title: 'Fermented Foods vs. Probiotic Supplements: Which Actually Works?',
    description: 'Both fermented foods and probiotic supplements claim to improve gut health. The evidence for each is different — in strength, mechanism, and practical outcome.',
    tags: ['fermented-foods', 'probiotics', 'supplements', 'gut-health', 'microbiome'],
    brief: 'Cover the Sonnenburg lab Stanford study (fermented foods vs. high-fiber diet for microbiome diversity), how live cultures in foods compare to encapsulated probiotics, the colonisation question (do probiotics actually colonise?), which strains have the strongest clinical evidence, and when supplements are worth taking vs. when food-first is sufficient.',
  },
  {
    pillar: 'nutrition',
    slug: 'ozempic-glp1-protein-diet-muscle-loss',
    title: 'Ozempic and Diet: How GLP-1 Users Should Adjust Protein and Training',
    description: 'GLP-1 medications cause significant caloric restriction — which, without intervention, leads to muscle loss alongside fat loss. Here is the evidence-based strategy to preserve muscle on GLP-1s.',
    tags: ['Ozempic', 'GLP-1', 'muscle-loss', 'protein', 'resistance-training'],
    brief: 'Cover the SURMOUNT and SUSTAIN trial muscle mass data, why rapid weight loss (>0.5kg/week) disproportionately affects lean mass, the evidence for higher protein targets on GLP-1s (1.6-2.2g/kg), the critical role of resistance training, the STEP-HFpEF and STEP-1 body composition data, and a practical protocol for GLP-1 users.',
  },
  {
    pillar: 'nutrition',
    slug: 'astaxanthin-antioxidant-longevity',
    title: 'Astaxanthin: The Most Potent Antioxidant You\'ve Probably Never Heard Of',
    description: 'Astaxanthin is a carotenoid found in salmon and krill that has demonstrated antioxidant activity 6,000x stronger than vitamin C in some assays. Here is what the human evidence actually shows.',
    tags: ['astaxanthin', 'antioxidant', 'carotenoid', 'longevity', 'skin-health'],
    brief: 'Cover what astaxanthin is and its unique antioxidant properties (crosses both blood-brain barrier and blood-retinal barrier), the human trial evidence (skin aging, exercise recovery, eye health, cardiovascular markers), natural food sources vs. supplements, optimal dosing, and honest caveats about antioxidant supplementation in general.',
  },
  {
    pillar: 'nutrition',
    slug: 'caffeine-timing-performance-adenosine',
    title: 'Caffeine Timing: The Science Behind the 90-Minute Morning Delay',
    description: 'Andrew Huberman\'s advice to delay morning coffee 90 minutes is one of the most-discussed sleep and performance recommendations of the decade. Here is what the adenosine science actually says.',
    tags: ['caffeine', 'adenosine', 'cortisol', 'sleep', 'performance'],
    brief: 'Cover cortisol\'s natural morning peak (and why caffeine on top may blunt it), adenosine clearance during sleep and why the 90-minute delay allows it to clear first, the half-life of caffeine and the afternoon cut-off calculation, individual variation in caffeine metabolism (CYP1A2 genotype), and what the evidence says about tolerance and cycling.',
  },
  {
    pillar: 'nutrition',
    slug: 'sibo-small-intestinal-bacterial-overgrowth',
    title: 'SIBO and Bloating: The Gut Dysbiosis Condition Affecting Millions Silently',
    description: 'Small intestinal bacterial overgrowth is a common, underdiagnosed cause of bloating, brain fog, and nutrient deficiencies. Here is how to identify it and what the evidence says about treatment.',
    tags: ['SIBO', 'bloating', 'gut-health', 'dysbiosis', 'microbiome'],
    brief: 'Cover what SIBO is and why it occurs (migrating motor complex dysfunction, low stomach acid, anatomical factors), the hydrogen and methane breath test, symptom patterns, the evidence for rifaximin, elemental diets, and low-FODMAP as treatments, the recurrence problem, and prokinetics for maintenance.',
  },
  {
    pillar: 'nutrition',
    slug: 'bone-broth-evidence-review',
    title: 'Bone Broth: Separating the Legitimate Benefits From the Marketing',
    description: 'Bone broth has been sold as a cure-all. Some claims are supported by evidence. Most are not. Here is a fair assessment.',
    tags: ['bone-broth', 'collagen', 'gut-health', 'glycine', 'minerals'],
    brief: 'Cover what bone broth actually contains (glycine, proline, hydroxyproline, minerals — but highly variable), the collagen precursor hypothesis and its limitations, the gut health claims (leaky gut — weak evidence), what glycine specifically does at therapeutic doses, the honest comparison to collagen peptide supplements, and practical guidance.',
  },
  {
    pillar: 'nutrition',
    slug: 'longevity-diet-longo-fasting-mimicking',
    title: 'Valter Longo\'s Longevity Diet: Fasting-Mimicking and Protein Cycling Explained',
    description: 'Valter Longo\'s longevity diet framework combines fasting-mimicking protocols with a pescatarian base diet and periodic protein restriction. Here is what the clinical evidence shows.',
    tags: ['Valter-Longo', 'fasting-mimicking', 'ProLon', 'longevity-diet', 'autophagy'],
    brief: 'Cover the longevity diet framework (mostly plant-based + fish, low protein generally, higher protein for 65+), the fasting-mimicking diet protocol (5 days, 800-1100 kcal), the clinical trials on FMD (cancer, diabetes, multiple sclerosis, aging biomarkers), the ProLon commercial product, and honest limitations of current evidence.',
  },

  // ── WELLNESS ──────────────────────────────────────────────────────────────
  {
    pillar: 'wellness',
    slug: 'perimenopause-explained-hormonal-changes',
    title: 'Perimenopause 101: What\'s Actually Happening in Your Body in Your 40s',
    description: 'Perimenopause is not a disease — but it is a profound biological transition that most women enter without adequate information. Here is a comprehensive guide to what is happening and why.',
    tags: ['perimenopause', 'hormones', 'estrogen', 'progesterone', 'menopause'],
    brief: 'Cover the hormonal cascade of perimenopause (FSH rise, erratic estrogen fluctuation, progesterone decline), timeline (average 7 years duration), the 34 recognised symptoms, why symptoms are so variable between women, the five stages of menopause transition, and what the first evidence-based steps look like.',
  },
  {
    pillar: 'wellness',
    slug: 'hrt-2026-fda-warning-removal-guide',
    title: 'HRT in 2026: What the FDA\'s Boxed Warning Removal Means for Women',
    description: 'In November 2025, the FDA removed the decades-old black box warning from hormone replacement therapy. Here is what that means, what changed, and what women should ask their doctors.',
    tags: ['HRT', 'menopause', 'FDA', 'estrogen', 'hormones'],
    brief: 'Cover the history of the WHI study and resulting black box warning, the subsequent re-analysis showing different risk profiles for younger women (timing hypothesis), the FDA\'s November 2025 decision, what types of HRT the change applies to, the current evidence on risks and benefits, and a practical guide to the conversation to have with your doctor.',
  },
  {
    pillar: 'wellness',
    slug: 'progesterone-vs-progestins-hrt-difference',
    title: 'Progesterone vs. Progestins: Why the Type of Hormone in Your HRT Matters',
    description: 'The type of progestogen in your HRT is not a small detail — it meaningfully changes the risk-benefit profile. Here is what the evidence shows about body-identical progesterone vs. synthetic progestins.',
    tags: ['progesterone', 'progestins', 'HRT', 'breast-cancer', 'menopause'],
    brief: 'Cover the difference between body-identical (micronised) progesterone and synthetic progestins, the WHI study used MPA (medroxyprogesterone acetate) not progesterone, the E3N cohort study breast cancer data, the cardiovascular and sleep differences, the UK MHRA position, and practical guidance on what to ask for.',
  },
  {
    pillar: 'wellness',
    slug: 'testosterone-women-decline-therapy',
    title: 'Testosterone in Women: What It Does, When It Declines, and When to Consider Therapy',
    description: 'Women produce and need testosterone — but discussion of women\'s testosterone is almost entirely absent from mainstream healthcare. Here is the evidence on what it does, when it matters, and what the options are.',
    tags: ['testosterone', 'women', 'libido', 'energy', 'HSDD'],
    brief: 'Cover testosterone\'s role in women (libido, energy, muscle, cognition, mood), the natural decline pattern (begins in 20s, continues through menopause), hypoactive sexual desire disorder (HSDD) evidence and FDA non-approval, the Global Consensus Statement on testosterone therapy, safety data, and practical considerations.',
  },
  {
    pillar: 'wellness',
    slug: 'bone-density-perimenopause-prevention',
    title: 'Bone Density and Perimenopause: The 5-Year Prevention Window',
    description: 'Women lose up to 20% of bone density in the 5–7 years around menopause. This window is the most critical for intervention. Here is the evidence for prevention.',
    tags: ['bone-density', 'perimenopause', 'osteoporosis', 'calcium', 'resistance-training'],
    brief: 'Cover the mechanism of estrogen-driven bone loss (osteoclast activation), the rate of loss during the menopause transition, the evidence for resistance training and impact exercise (LIFTMOR trial), calcium and vitamin D and K2 requirements, HRT\'s bone-protective effect, and when DEXA screening is appropriate.',
  },
  {
    pillar: 'wellness',
    slug: 'female-athlete-triad-red-s-womens-health',
    title: 'Relative Energy Deficiency in Sport: What Active Women Need to Know',
    description: 'RED-S — formerly called the female athlete triad — is a common, underdiagnosed condition in active women that affects bone health, hormones, cognition, and immune function.',
    tags: ['RED-S', 'female-athlete-triad', 'energy-availability', 'bone-stress', 'hormonal-health'],
    brief: 'Cover the evolution from female athlete triad to RED-S framework, the mechanism (low energy availability → hypothalamic suppression → low estrogen → bone loss + other downstream effects), how to calculate energy availability, subclinical RED-S in recreational athletes, the LEAF-Q questionnaire, and recovery strategies.',
  },
  {
    pillar: 'wellness',
    slug: 'cortisol-women-hormones-life-stages',
    title: 'Cortisol and Women: Why Stress Hits Your Hormones Differently at Different Life Stages',
    description: 'Estrogen modulates the stress response — which means cortisol dysregulation looks and feels different across a woman\'s reproductive life, perimenopause, and postmenopause.',
    tags: ['cortisol', 'women', 'stress', 'HPA-axis', 'estrogen'],
    brief: 'Cover estrogen\'s modulatory role on HPA axis reactivity, how the stress response changes across the menstrual cycle, pregnancy, postpartum, perimenopause, and postmenopause, why perimenopausal women are particularly vulnerable to cortisol dysregulation, and evidence-based interventions for each life stage.',
  },
  {
    pillar: 'wellness',
    slug: 'pcos-metabolic-health-longevity-risks',
    title: 'PCOS and Longevity: The Metabolic Risks You Need to Manage',
    description: 'PCOS is usually framed as a fertility issue. The long-term metabolic, cardiovascular, and endometrial risks make it a significant longevity concern that requires active management.',
    tags: ['PCOS', 'metabolic-health', 'insulin-resistance', 'cardiovascular', 'longevity'],
    brief: 'Cover the long-term metabolic risks of PCOS (type 2 diabetes, cardiovascular disease, endometrial cancer, non-alcoholic fatty liver disease), why insulin resistance is central, the evidence for lifestyle interventions (resistance training, low-glycaemic diet), metformin\'s role, and inositol supplementation evidence.',
  },
  {
    pillar: 'wellness',
    slug: 'perimenopause-anxiety-brain-chemistry',
    title: 'Perimenopause and Anxiety: Why Brain Chemistry Changes in Your 40s',
    description: 'Up to 70% of perimenopausal women experience anxiety — often for the first time. The mechanism is hormonal and neurological, not psychological weakness. Here is the science.',
    tags: ['perimenopause', 'anxiety', 'GABA', 'estrogen', 'brain-chemistry'],
    brief: 'Cover the mechanism: estrogen\'s role in GABA modulation and serotonin production, the neurosteroid allopregnanolone produced from progesterone and its anxiolytic effects, why fluctuating (not just low) hormones drive anxiety in perimenopause, the evidence for HRT, CBT, and SSRIs in this context, and the PRISM trial.',
  },
  {
    pillar: 'wellness',
    slug: 'estrogen-brain-cognitive-protection',
    title: 'Estrogen and the Brain: Cognitive Protection Through the Menopause Transition',
    description: 'Estrogen has significant neuroprotective effects. Its decline during menopause increases Alzheimer\'s risk — particularly in women who undergo early or surgical menopause. Here is what the evidence shows.',
    tags: ['estrogen', 'brain-health', 'dementia', 'Alzheimer', 'neuroprotection'],
    brief: 'Cover estrogen\'s neuroprotective mechanisms (glucose metabolism, amyloid clearance, cholinergic neurons), the critical period hypothesis for HRT and dementia risk, the WHIMS study vs. ELITE trial contrast, estrogen receptors in the brain, early menopause as a risk factor, and what the current evidence supports clinically.',
  },
  {
    pillar: 'wellness',
    slug: 'burnout-science-brain-body-effects',
    title: 'The Science of Burnout: What Chronic Work Stress Does to Your Brain and Body',
    description: 'Burnout is not just exhaustion. It is a measurable physiological state with documented effects on the brain, immune system, cardiovascular system, and hormones. Here is what the research shows.',
    tags: ['burnout', 'chronic-stress', 'cortisol', 'HPA-axis', 'recovery'],
    brief: 'Cover the WHO definition of burnout, its neuroscience (prefrontal-amygdala dysregulation, HPA axis changes, reduced hippocampal volume), the distinction from depression, Christina Maslach\'s three-dimensional framework, biomarkers of burnout (cortisol blunting, elevated IL-6), and evidence-based recovery interventions.',
  },
  {
    pillar: 'wellness',
    slug: 'womens-longevity-decade-by-decade-guide',
    title: 'Longevity for Women: A Decade-by-Decade Guide (30s, 40s, 50s, 60s)',
    description: 'Women\'s health risks and opportunities shift dramatically across decades. This evidence-based guide maps the key interventions, screenings, and lifestyle priorities for each stage.',
    tags: ['womens-longevity', 'healthspan', 'preventive-health', 'perimenopause', 'aging'],
    brief: 'This is BestKarma\'s flagship women\'s healthspan article. For each decade: 30s (foundation-building, fertility awareness, cardiovascular baseline, bone density start), 40s (perimenopause recognition, cognitive health, resistance training escalation, HRT decision-making), 50s (postmenopause consolidation, cardiovascular risk shift), 60s (sarcopenia prevention, fall prevention, cognitive resilience). Each section should include specific screenings and evidence-based priorities.',
  },
  {
    pillar: 'wellness',
    slug: 'sexual-health-longevity-evidence',
    title: 'Sexual Health and Longevity: Why Intimacy Matters for Long-Term Wellbeing',
    description: 'Sexual health is a meaningful contributor to overall health and longevity — through cardiovascular, immune, psychological, and social pathways. Here is what the research shows.',
    tags: ['sexual-health', 'longevity', 'intimacy', 'cardiovascular', 'wellbeing'],
    brief: 'Cover the epidemiological data linking sexual activity to reduced cardiovascular disease and all-cause mortality, the specific physiological mechanisms (oxytocin, DHEA, cortisol reduction), the impact of GSM and sexual dysfunction on health outcomes, the evidence for addressing sexual health as part of standard preventive care, and the importance of partner relationship quality.',
  },
  {
    pillar: 'wellness',
    slug: 'genitourinary-syndrome-menopause-gsm',
    title: 'Genitourinary Syndrome of Menopause: The Condition Nobody Talks About',
    description: 'GSM affects at least 50% of postmenopausal women and worsens without treatment. Unlike hot flashes, it never resolves on its own. Here is what it is and what works.',
    tags: ['GSM', 'menopause', 'vaginal-atrophy', 'urinary-symptoms', 'estrogen'],
    brief: 'Cover what GSM is (the combined vaginal, urological, and sexual symptoms of estrogen deficiency), why it worsens without treatment (unlike vasomotor symptoms), the treatment options from least to most systemic (vaginal moisturisers, local estrogen, ospemifene, systemic HRT), the safety evidence for local estrogen in breast cancer survivors, and the shame and silence problem.',
  },
  {
    pillar: 'wellness',
    slug: 'slow-living-cozy-wellness-science',
    title: 'Slow Living: The Evidence Behind Quieter, Less Optimised Self-Care',
    description: 'Optimisation culture is giving way to something quieter — slow living, intentional rest, and "cozymaxxing." Here is what the science says about why deceleration is genuinely good for you.',
    tags: ['slow-living', 'rest', 'stress-recovery', 'wellbeing', 'leisure'],
    brief: 'Cover the parasympathetic nervous system restoration that occurs during truly unstructured time, the difference between productive rest and passive entertainment, the science of leisure (Kahneman\'s distinction, Csikszentmihalyi on positive leisure), the health costs of hyperproductivity, and what practices the evidence supports for genuine recovery.',
  },
  {
    pillar: 'wellness',
    slug: 'health-behaviour-change-psychology',
    title: 'Why Willpower Fails: The Psychology of Lasting Health Behaviour Change',
    description: 'Most people know what they should do to be healthier. The gap between knowledge and action is not a willpower problem — it is a psychology and environment design problem.',
    tags: ['behaviour-change', 'psychology', 'habits', 'motivation', 'self-determination'],
    brief: 'Cover self-determination theory (autonomy, competence, relatedness), implementation intentions and if-then planning, identity-based change (James Clear\'s framework but cite the original Deci + Ryan research), environment design and friction reduction, the Stages of Change model, and why willpower is a depletable resource that should be used sparingly.',
  },
  {
    pillar: 'wellness',
    slug: 'psychedelics-mental-health-clinical-evidence',
    title: 'Psychedelics and Mental Health: What the Clinical Evidence Actually Shows',
    description: 'Psilocybin, MDMA, and ketamine are advancing through clinical trials at unprecedented speed. Here is an honest summary of where the evidence stands for each condition.',
    tags: ['psilocybin', 'ketamine', 'MDMA', 'mental-health', 'clinical-trials'],
    brief: 'Cover psilocybin for depression (COMPASS Pathways Phase 2b, Johns Hopkins MDD studies, COMP360), MDMA for PTSD (Phase 3 FDA rejection and issues), ketamine/esketamine (FDA-approved), what these compounds share mechanistically (neuroplasticity, default mode network quieting), current access pathways, and what the evidence does not yet support.',
  },
  {
    pillar: 'wellness',
    slug: 'nervous-system-reset-sympathetic-parasympathetic',
    title: 'The Nervous System Reset: Shifting From Sympathetic to Parasympathetic Dominance',
    description: 'Chronic sympathetic nervous system activation is a root cause of many modern health problems. Here is the evidence for techniques that genuinely shift the balance.',
    tags: ['nervous-system', 'parasympathetic', 'sympathetic', 'HRV', 'stress'],
    brief: 'Cover the autonomic nervous system balance, chronic sympathetic dominance (allostatic load), and evidence-based techniques to activate parasympathetic response: slow diaphragmatic breathing (4-7-8, box breathing evidence), cold water face immersion (diving reflex), progressive muscle relaxation, yoga nidra, and what each does mechanistically.',
  },
  {
    pillar: 'wellness',
    slug: 'nature-prescriptions-park-rx-health',
    title: 'Nature Prescriptions: How Doctors Are Formally Prescribing Time Outdoors',
    description: 'Park Rx America, NHS walks, and nature prescription programmes in Japan, Scotland, and New Zealand are formalising what the evidence increasingly supports. Here is the science.',
    tags: ['nature-prescriptions', 'Park-Rx', 'green-exercise', 'mental-health', 'cortisol'],
    brief: 'Cover the evidence base for nature prescriptions (cortisol reduction, blood pressure, attention restoration theory, stress recovery theory), the Park Rx America programme, the NHS social prescribing Green Social Prescribing pilot, shinrin-yoku prescription in Japan, and the dose-response data (how much nature contact produces measurable health effects).',
  },
  {
    pillar: 'wellness',
    slug: 'skin-longevity-organ-aging-science',
    title: 'Skin as a Longevity Organ: What Dermatology Science Tells Us About Aging from the Outside In',
    description: 'The skin is not just cosmetically important — it is a metabolic, immune, and endocrine organ. How it ages reflects and influences how the rest of the body ages.',
    tags: ['skin-aging', 'collagen', 'photoaging', 'longevity', 'senescence'],
    brief: 'Cover skin as an endocrine and immune organ (vitamin D production, cytokine signaling), the mechanisms of intrinsic vs. extrinsic (UV, pollution) aging, collagen and elastin degradation, the role of skin senescent cells in systemic inflammaging, what the evidence actually shows for sunscreen, retinoids, and specific anti-aging ingredients.',
  },
  {
    pillar: 'wellness',
    slug: 'optimism-longevity-positive-psychology',
    title: 'The Longevity Case for Optimism: What Positive Psychology Says About Living Longer',
    description: 'Trait optimism is associated with a 15% longer lifespan in large cohort studies. This is not a placebo effect — there are clear biological pathways. Here is the evidence.',
    tags: ['optimism', 'longevity', 'positive-psychology', 'cardiovascular', 'immune-function'],
    brief: 'Cover the Harvard-Yale Women\'s Health Study, the UK Biobank optimism-longevity data, the biological pathways (lower inflammation, better immune function, healthier behaviours, cardiovascular reactivity), the distinction between dispositional optimism and toxic positivity, and evidence-based practices for building optimism (not just thinking positive).',
  },
  {
    pillar: 'wellness',
    slug: 'social-connection-biology-mortality',
    title: 'Social Connection as Medicine: The Biology of How Relationships Reduce Mortality',
    description: 'Social connection reduces all-cause mortality as powerfully as quitting smoking. The biological mechanisms are now well-mapped. Here is what the science shows.',
    tags: ['social-connection', 'longevity', 'oxytocin', 'immune-function', 'mortality'],
    brief: 'Cover Holt-Lunstad\'s meta-analysis (148 studies, 308,000 participants), the specific biological pathways (oxytocin and immune modulation, HPA axis buffering, cardiovascular reactivity), why perceived social support matters more than objective contact, how digital social interaction compares to in-person, and evidence-based ways to build meaningful connection.',
  },

  // ── MIND-BODY ─────────────────────────────────────────────────────────────
  {
    pillar: 'mind-body',
    slug: 'rucking-weighted-walking-longevity',
    title: 'Rucking: The Ancient Practice That\'s Become a Modern Longevity Tool',
    description: 'Rucking — walking with a weighted pack — burns significantly more calories than walking, builds posterior chain strength, and provides an accessible entry point to loaded movement for people who don\'t lift.',
    tags: ['rucking', 'walking', 'strength-training', 'cardio', 'longevity'],
    brief: 'Cover the history of rucking (military origins), the metabolic and musculoskeletal benefits vs. regular walking, the cardiovascular load and energy expenditure data, the GORUCK community and cultural moment, how rucking compares to zone 2 cardio, the practical getting-started protocol (load, terrain, duration), and injury risks to avoid.',
  },
  {
    pillar: 'mind-body',
    slug: 'pickleball-longevity-social-sport-science',
    title: 'Pickleball and Longevity: The Science Behind Why Social Sport Extends Life',
    description: 'Pickleball is the fastest-growing sport in America. Beyond the fun, it combines moderate cardiovascular exercise, social connection, and coordination in a way that creates a unique longevity profile.',
    tags: ['pickleball', 'social-sport', 'longevity', 'cardiovascular', 'community'],
    brief: 'Cover the physiological demands of pickleball (moderate-to-vigorous aerobic, reaction time, coordination), the combined cardiovascular and social benefit data, the squash longevity study (Oja et al.) showing racquet sports top for mortality reduction, why the social dimension amplifies health effects, and practical guidance for getting started at any fitness level.',
  },
  {
    pillar: 'mind-body',
    slug: 'functional-fitness-longevity-evidence',
    title: 'Functional Fitness: Evidence for Training the Movements of Real Life',
    description: 'Functional fitness — training movement patterns rather than isolated muscles — is the #1 fitness trend for 2026. Here is what the evidence says about its longevity benefits.',
    tags: ['functional-fitness', 'movement', 'longevity', 'daily-function', 'ACSM'],
    brief: 'Cover what functional fitness means (movement pattern training vs. isolated machine work), the evidence for its longevity benefits (grip strength, gait speed, chair stand test as mortality predictors), why pattern-based training transfers better to real life as we age, key functional movements to train, and how to build a functional program.',
  },
  {
    pillar: 'mind-body',
    slug: 'balance-training-longevity-fall-prevention',
    title: 'Balance Training: Why Standing on One Leg Predicts How Long You\'ll Live',
    description: 'A 2022 British Journal of Sports Medicine study found that inability to stand on one leg for 10 seconds was associated with 84% higher risk of all-cause mortality. Here is the science behind balance and longevity.',
    tags: ['balance', 'vestibular', 'proprioception', 'fall-prevention', 'longevity'],
    brief: 'Cover the Araújo 2022 study and what it actually measured, why balance predicts mortality (it reflects vestibular function, proprioception, neuromuscular integration, and cerebellar health), how balance declines with age, the evidence-based balance training interventions (single-leg stands, wobble boards, tai chi, yoga), and a practical balance assessment and training protocol.',
  },
  {
    pillar: 'mind-body',
    slug: 'mobility-vs-flexibility-aging-difference',
    title: 'Mobility vs. Flexibility: Why the Difference Matters for How You Age',
    description: 'Flexibility is passive range of motion. Mobility is active control within that range. They are different qualities — and only one of them protects you as you age.',
    tags: ['mobility', 'flexibility', 'joint-health', 'aging', 'movement'],
    brief: 'Explain the distinction between passive flexibility and active mobility (controlled range of motion under load), why mobility is the longevity-relevant quality, the specific joint mobility assessments (FMS, deep squat, shoulder CARs), how sitting and sedentary behaviour erodes mobility, and a practical daily mobility routine with the strongest evidence base.',
  },
  {
    pillar: 'mind-body',
    slug: 'japanese-interval-walking-protocol',
    title: 'Japanese Interval Walking: The Simple Protocol That Outperformed Standard Cardio',
    description: 'Japanese interval walking — alternating 3 minutes of fast walking with 3 minutes of slow walking for 30 minutes — was found to outperform continuous moderate walking across multiple health markers.',
    tags: ['interval-walking', 'IWT', 'Shinshu-University', 'cardio', 'longevity'],
    brief: 'Cover the Shinshu University research (Hiroshi Nose and colleagues), the specific protocol (3+3 minute alternation, ~5 days/week), the outcomes measured (VO2max, leg strength, blood pressure, metabolic markers) compared to continuous walking, why alternating intensity may be superior for older adults, and how to implement the protocol practically.',
  },
  {
    pillar: 'mind-body',
    slug: 'polyvagal-theory-explained-nervous-system',
    title: 'The Polyvagal Theory in Plain English: How Safety Signals Regulate Your Nervous System',
    description: 'Stephen Porges\'s polyvagal theory has transformed how trauma therapists, yoga teachers, and neuroscientists think about safety, connection, and the autonomic nervous system. Here is a clear explanation.',
    tags: ['polyvagal-theory', 'vagus-nerve', 'nervous-system', 'trauma', 'safety'],
    brief: 'Explain the three neural circuits (ventral vagal/social, sympathetic/mobilisation, dorsal vagal/shutdown), the concept of neuroception, why the body detects safety before the mind does, how trauma disrupts vagal tone, and evidence-based practices that activate the ventral vagal state (prosodic voice, eye contact, slow breathing, gentle movement).',
  },
  {
    pillar: 'mind-body',
    slug: 'somatic-yoga-nervous-system-practice',
    title: 'Somatic Yoga: How Body-Based Movement Differs From Conventional Yoga',
    description: 'Somatic yoga emphasises internal sensation over external form — and this shift in attention may be what makes it effective for nervous system regulation and trauma-informed healing.',
    tags: ['somatic-yoga', 'somatic-therapy', 'nervous-system', 'trauma', 'body-awareness'],
    brief: 'Cover the distinctions between conventional yoga and somatic practice (proprioceptive attention, pandiculation, no performance orientation), the Thomas Hanna somatic movement tradition, why somatic approaches may be particularly effective for chronic pain and trauma, the evidence base (still emerging), and practical entry points for beginners.',
  },
  {
    pillar: 'mind-body',
    slug: 'grief-physiology-body-healing',
    title: 'Grief and the Body: The Physiology of Loss and How to Support Healing',
    description: 'Grief has measurable physiological effects — on the heart, immune system, brain, and endocrine system. Understanding the biology of grief can change how we support recovery.',
    tags: ['grief', 'loss', 'immune-function', 'broken-heart-syndrome', 'healing'],
    brief: 'Cover broken heart syndrome (takotsubo cardiomyopathy), the immune suppression documented after bereavement, the elevated cortisol and inflammatory markers in acute grief, changes in sleep architecture, how prolonged grief disorder differs from normal grief, and what the evidence shows about physical interventions (movement, sleep, social connection) that support grief recovery.',
  },
  {
    pillar: 'mind-body',
    slug: 'meditation-dose-response-minimum-effective',
    title: 'How Much Meditation Do You Actually Need? The Dose-Response Evidence',
    description: 'Meditation research has produced dose-response data that is rarely communicated clearly. Here is what we know about the minimum effective dose for specific outcomes.',
    tags: ['meditation', 'mindfulness', 'dose-response', 'anxiety', 'stress'],
    brief: 'Cover dose-response data for specific meditation outcomes: anxiety reduction (even 10-15 min/day shows effects in Goyal 2014 meta-analysis), attention (8-week MBSR is the most-studied protocol), pain management, cortisol reduction, and structural brain changes (require longer practice). Distinguish between outcomes and be honest about where 5-minute apps are and aren\'t sufficient.',
  },
  {
    pillar: 'mind-body',
    slug: 'tai-chi-longevity-evidence',
    title: 'Tai Chi for Longevity: Falls, Cognition, and Mortality',
    description: 'Tai chi has one of the strongest evidence bases of any mind-body practice — particularly for falls prevention, cognitive function, and cardiovascular health in older adults.',
    tags: ['tai-chi', 'falls-prevention', 'cognition', 'balance', 'longevity'],
    brief: 'Cover the falls prevention evidence (Li 2005 NEJM study, subsequent meta-analyses), the cardiovascular outcomes data, the cognitive function and dementia prevention research, the possible mechanisms (dual-task training, proprioception, meditation component), and a practical guide to starting tai chi including what style and duration the evidence supports.',
  },
  {
    pillar: 'mind-body',
    slug: 'micro-meditation-two-minute-practices',
    title: 'Micro-Meditations: The Case for 2-Minute Mindfulness Throughout the Day',
    description: 'Long formal meditation is inaccessible for most people. The emerging evidence for brief, frequent mindfulness moments distributed across the day is more encouraging than commonly understood.',
    tags: ['micro-meditation', 'mindfulness', 'stress', 'attention', 'practical-meditation'],
    brief: 'Cover the evidence for brief mindfulness interventions (Zeidan 2010 four-day training, focused breathing between tasks, transition rituals), what changes in 2 minutes vs. what requires sustained practice, the case for micro-meditations vs. the case for longer sessions, and 5 practical formats that fit into workday transitions.',
  },
  {
    pillar: 'mind-body',
    slug: 'body-scan-meditation-interoception-science',
    title: 'Body Scan Meditation: The Neuroscience of Interoception',
    description: 'Body scan meditation is one of the most-studied mindfulness techniques. Its mechanism — improving interoceptive awareness — turns out to have wide-ranging health implications.',
    tags: ['body-scan', 'interoception', 'meditation', 'insula', 'somatic-awareness'],
    brief: 'Explain interoception (the perception of internal body states), the insula\'s role as the interoceptive cortex, how body scan meditation develops interoceptive accuracy, the evidence linking interoceptive awareness to emotion regulation, eating behaviour, pain, and anxiety, and the specific MBSR body scan protocol and evidence.',
  },
  {
    pillar: 'mind-body',
    slug: 'exercise-depression-antidepressant-dose',
    title: 'Exercise as Antidepressant: The Dose, Type, and Timing That Works Best',
    description: 'A 2024 meta-analysis of 218 trials found exercise comparable in efficacy to antidepressants for major depression. Here is what works, at what dose, and for whom.',
    tags: ['exercise', 'depression', 'antidepressant', 'BDNF', 'mental-health'],
    brief: 'Cover the Noetel 2024 BMJ mega-analysis, the specific exercise types ranked by effect size (walking and jogging > yoga > strength training for depression), the mechanism (BDNF, neurogenesis, HPA axis normalisation, inflammation reduction), dose-response data, how exercise compares to and combines with medication, and who may not respond.',
  },
  {
    pillar: 'mind-body',
    slug: 'resting-heart-rate-longevity-marker',
    title: 'Resting Heart Rate as a Longevity Marker: What to Aim For and How to Lower It',
    description: 'Resting heart rate is one of the simplest and most powerful cardiovascular longevity markers. Here is what a good number looks like, what drives it up, and how to bring it down.',
    tags: ['resting-heart-rate', 'cardiovascular', 'longevity', 'VO2-max', 'wearables'],
    brief: 'Cover the epidemiological evidence linking resting HR to all-cause mortality (Jouven 2005, the Copenhagen City Heart Study), what constitutes low, normal, and elevated resting HR, the main determinants (fitness, stress, sleep, body weight, medications, thyroid), and the evidence-based interventions for lowering resting HR (primarily zone 2 training).',
  },
  {
    pillar: 'mind-body',
    slug: 'proprioception-aging-training-guide',
    title: 'Proprioception: The Hidden Sense That Keeps You Upright and Aging Well',
    description: 'Proprioception — your body\'s sense of its own position in space — declines measurably from age 40 and is a primary driver of falls and mobility loss in older adults. It can be trained.',
    tags: ['proprioception', 'balance', 'aging', 'fall-prevention', 'neuromuscular'],
    brief: 'Cover what proprioception is and its neural basis (muscle spindles, Golgi tendon organs, joint receptors), how it declines with age, the clinical evidence linking proprioceptive deficits to falls and injury, the exercise interventions that most effectively improve proprioception (single-leg training, wobble boards, vibration platforms, tai chi), and a practical training protocol.',
  },
  {
    pillar: 'mind-body',
    slug: 'adult-play-science-health-benefits',
    title: 'The Science of Adult Play: Why Unstructured Activity Is a Health Necessity',
    description: 'Play is not just for children. Adults who engage in genuinely playful, unstructured activity show measurable benefits across cognitive, social, and physical domains.',
    tags: ['play', 'spontaneous-movement', 'creativity', 'social-play', 'wellbeing'],
    brief: 'Cover Stuart Brown\'s play research and taxonomy, the distinction between play, leisure, and recreation, the neurological underpinnings (dopamine, default mode network), evidence linking adult play to creativity, stress resilience, and relationship quality, why hyperproductivity culture suppresses play, and practical re-introduction of play for adults.',
  },
  {
    pillar: 'mind-body',
    slug: 'cold-plunge-vs-sauna-recovery-guide',
    title: 'Cold Plunge vs. Sauna: Which Is Right for You, and When to Use Each',
    description: 'Cold plunges and saunas are both powerful recovery tools — but they work through different mechanisms and suit different goals. Here is how to choose and sequence them.',
    tags: ['cold-plunge', 'sauna', 'recovery', 'hormesis', 'cardiovascular'],
    brief: 'Cover the distinct mechanisms of cold (vasoconstriction, norepinephrine, anti-inflammatory blunting of hypertrophy) and heat (heat shock proteins, plasma volume expansion, cardiovascular training effect), the evidence for each use case (cardiovascular health, mood, muscle recovery, sleep), and how to sequence contrast therapy for optimal outcomes based on goals.',
  },
  {
    pillar: 'mind-body',
    slug: 'walking-yoga-mindful-movement',
    title: 'Walking Yoga: The Mindful Movement Practice Combining Two Longevity Staples',
    description: 'Walking yoga — integrating breath, awareness, and gentle movement sequences into walking — is one of 2025\'s most searched wellness practices. Here is what the science behind it actually shows.',
    tags: ['walking-yoga', 'mindful-movement', 'zone-2', 'mindfulness', 'outdoor-exercise'],
    brief: 'Cover the components of walking yoga (rhythmic breath, body awareness, intentional pacing, occasional movement sequences), how it combines the cardiovascular benefits of walking with the attention and parasympathetic benefits of yoga, the relevant research on mindful walking (laboratory-based and naturalistic), and a practical starter protocol.',
  },
  {
    pillar: 'mind-body',
    slug: 'pilates-longevity-core-spinal-health',
    title: 'The Longevity Case for Pilates: Core, Posture, and Spinal Health Over a Lifetime',
    description: 'Pilates is consistently associated with improvements in core strength, spinal stability, balance, and pain — qualities that matter more for longevity than most popular exercise trends acknowledge.',
    tags: ['Pilates', 'core-strength', 'spinal-health', 'balance', 'longevity'],
    brief: 'Cover the evidence base for Pilates (systematic reviews on chronic low back pain, balance in older adults, spinal mobility), the mechanisms (deep stabiliser activation, proprioceptive training, breathing integration), how Pilates differs from conventional core training, the clinical applications (scoliosis, osteoporosis-adapted), and practical guidance on reformer vs. mat approaches.',
  },
  {
    pillar: 'mind-body',
    slug: 'mindful-strength-training-mind-body',
    title: 'Mindful Strength: How Combining Resistance Training with Mindfulness Changes Outcomes',
    description: 'Attentional focus during strength training — specifically internal focus on the working muscle — measurably improves strength and hypertrophy outcomes. Here is the evidence.',
    tags: ['mindful-strength', 'resistance-training', 'attentional-focus', 'mind-muscle', 'mindfulness'],
    brief: 'Cover the mind-muscle connection research (Calatayud, Schoenfeld, and Snyder\'s attentional focus studies), internal vs. external focus effects on EMG activation and strength development, the psychological benefits of bringing mindful attention to physical training (reduced anxiety, improved body image), and how to implement mindful strength training practically.',
  },
];

async function createSeedFile(article) {
  const dir = path.join(contentRoot, 'drafts', article.pillar);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${article.slug}.md`);

  // Skip if already exists
  try {
    await fs.access(filePath);
    console.log(`  ⟳ Skipped (exists): ${article.slug}`);
    return false;
  } catch {
    // File doesn't exist — create it
  }

  const tags = article.tags.map(t => `"${t}"`).join(', ');
  const today = new Date().toISOString().split('T')[0];

  const content = `---
slug: ${article.slug}
title: "${article.title.replace(/"/g, '\\"')}"
description: "${article.description.replace(/"/g, '\\"')}"
author: bestkarma-editorial
reviewer: gpt-validator
pubDate: ${today}
reviewedDate: ${today}
heroImage: ""
category: ${article.pillar}
tags: [${tags}]
readTime: 8
status: briefed
---

## Brief

${article.brief}
`;

  await fs.writeFile(filePath, content, 'utf8');
  return true;
}

let created = 0;
let skipped = 0;

for (const article of ARTICLES) {
  process.stdout.write(`Creating: ${article.slug}...`);
  const wasCreated = await createSeedFile(article);
  if (wasCreated) {
    console.log(' ✓');
    created++;
  } else {
    skipped++;
  }
}

console.log(`\nDone. ${created} seed files created, ${skipped} skipped (already existed).`);
