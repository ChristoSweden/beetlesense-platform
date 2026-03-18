// ─── Forest Owner Learning Academy — Course Data ───
// 15 bite-sized educational modules for Swedish forest owners.

export type AcademyTopic =
  | 'getting_started'
  | 'tree_care'
  | 'pest_management'
  | 'operations'
  | 'legal_tax'
  | 'climate_sustainability';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface QuizOption {
  id: string;
  text_en: string;
  text_sv: string;
}

export interface SectionQuiz {
  question_en: string;
  question_sv: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation_en: string;
  explanation_sv: string;
}

export interface LessonSection {
  title_en: string;
  title_sv: string;
  content_en: string;
  content_sv: string;
  keyTakeaway_en: string;
  keyTakeaway_sv: string;
  quiz?: SectionQuiz;
}

export interface AcademyLesson {
  id: string;
  title_en: string;
  title_sv: string;
  description_en: string;
  description_sv: string;
  topic: AcademyTopic;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  icon: string;
  sections: LessonSection[];
}

export const TOPIC_COLORS: Record<AcademyTopic, string> = {
  getting_started: '#4ade80',
  tree_care: '#22c55e',
  pest_management: '#ef4444',
  operations: '#f59e0b',
  legal_tax: '#3b82f6',
  climate_sustainability: '#06b6d4',
};

export const TOPIC_I18N_KEYS: Record<AcademyTopic, string> = {
  getting_started: 'academy.topics.gettingStarted',
  tree_care: 'academy.topics.treeCare',
  pest_management: 'academy.topics.pestManagement',
  operations: 'academy.topics.operations',
  legal_tax: 'academy.topics.legalTax',
  climate_sustainability: 'academy.topics.climateSustainability',
};

export const DIFFICULTY_I18N_KEYS: Record<DifficultyLevel, string> = {
  beginner: 'academy.difficulty.beginner',
  intermediate: 'academy.difficulty.intermediate',
  advanced: 'academy.difficulty.advanced',
};

export const academyLessons: AcademyLesson[] = [
  // ─── 1. Understanding Your Skogsbruksplan ───
  {
    id: 'skogsbruksplan',
    title_en: 'Understanding Your Skogsbruksplan',
    title_sv: 'Förstå din skogsbruksplan',
    description_en: 'Learn to read and use your forest management plan — the most important document a Swedish forest owner has.',
    description_sv: 'Lär dig läsa och använda din skogsbruksplan — det viktigaste dokumentet en svensk skogsägare har.',
    topic: 'getting_started',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    icon: 'FileText',
    sections: [
      {
        title_en: 'What is a Skogsbruksplan?',
        title_sv: 'Vad är en skogsbruksplan?',
        content_en: 'A skogsbruksplan (forest management plan) is a comprehensive document that describes your forest property in detail. It divides your forest into stands (avdelningar), each with data on tree species, age, volume, and recommended actions. In Sweden, having an up-to-date plan is essential for making informed decisions about harvesting, thinning, and conservation.\n\nThe plan typically covers a 10-year period and is created by a certified forest consultant who inventories your property. It includes maps, stand descriptions, and action proposals.',
        content_sv: 'En skogsbruksplan är ett heltäckande dokument som beskriver din skogsfastighet i detalj. Den delar in din skog i avdelningar, var och en med data om trädslag, ålder, volym och rekommenderade åtgärder. I Sverige är det avgörande att ha en aktuell plan för att fatta välgrundade beslut om avverkning, gallring och naturvård.\n\nPlanen omfattar normalt en 10-årsperiod och tas fram av en certifierad skogskonsulent som inventerar din fastighet. Den innehåller kartor, avdelningsbeskrivningar och åtgärdsförslag.',
        keyTakeaway_en: 'Your skogsbruksplan is a 10-year roadmap for your forest. It is divided into stands with specific data and action recommendations.',
        keyTakeaway_sv: 'Din skogsbruksplan är en 10-årig färdplan för din skog. Den är indelad i avdelningar med specifik data och åtgärdsrekommendationer.',
        quiz: {
          question_en: 'How long does a typical skogsbruksplan cover?',
          question_sv: 'Hur lång period omfattar en typisk skogsbruksplan?',
          options: [
            { id: 'a', text_en: '5 years', text_sv: '5 år' },
            { id: 'b', text_en: '10 years', text_sv: '10 år' },
            { id: 'c', text_en: '20 years', text_sv: '20 år' },
          ],
          correctOptionId: 'b',
          explanation_en: 'A standard Swedish forest management plan covers a 10-year planning period.',
          explanation_sv: 'En standard svensk skogsbruksplan omfattar en 10-årig planeringsperiod.',
        },
      },
      {
        title_en: 'Reading Stand Data',
        title_sv: 'Läsa avdelningsdata',
        content_en: 'Each stand in your plan has key metrics:\n\n- **Tree species mix** (trädslag): e.g., 70% spruce, 30% pine\n- **Age** (ålder): average age of the dominant trees\n- **Volume** (m³sk): standing timber volume per hectare\n- **Site index** (bonitet): soil productivity class (G/T followed by a number)\n- **Recommended action** (åtgärdsförslag): what to do and when\n\nThe site index is especially important — it tells you how productive the land is. A higher number means faster tree growth.',
        content_sv: 'Varje avdelning i din plan har nyckelmått:\n\n- **Trädslag**: t.ex. 70% gran, 30% tall\n- **Ålder**: medelålder för de dominerande träden\n- **Volym** (m³sk): stående virkesvolym per hektar\n- **Bonitet**: markens produktivitetsförmåga (G/T följt av ett tal)\n- **Åtgärdsförslag**: vad som bör göras och när\n\nBoniteten är särskilt viktig — den visar hur produktiv marken är. Högre tal innebär snabbare trädtillväxt.',
        keyTakeaway_en: 'Key stand metrics include species mix, age, volume (m³sk), site index (bonitet), and recommended action.',
        keyTakeaway_sv: 'Viktiga avdelningsmått inkluderar trädslag, ålder, volym (m³sk), bonitet och åtgärdsförslag.',
      },
      {
        title_en: 'Using Your Plan with BeetleSense',
        title_sv: 'Använda din plan med BeetleSense',
        content_en: 'BeetleSense integrates with your skogsbruksplan data. When you register your parcels, the platform overlays satellite health data, pest risk assessments, and weather forecasts on top of your plan data. This means you can see not just what your plan recommends, but also real-time conditions that might change priorities.\n\nFor example, if your plan suggests thinning in stand 3 this year, but BeetleSense detects elevated bark beetle risk nearby, you might prioritize removing infested trees first.',
        content_sv: 'BeetleSense integreras med data från din skogsbruksplan. När du registrerar dina skiften lägger plattformen satellithälsodata, skadedjursriskbedömningar och väderprognoser ovanpå din plandata. Det innebär att du kan se inte bara vad din plan rekommenderar, utan också realtidsförhållanden som kan ändra prioriteringar.\n\nOm din plan till exempel föreslår gallring i avdelning 3 i år, men BeetleSense upptäcker förhöjd barkborrerisk i närheten, kanske du prioriterar att ta bort angripna träd först.',
        keyTakeaway_en: 'BeetleSense adds real-time intelligence on top of your static forest plan, helping you adapt priorities dynamically.',
        keyTakeaway_sv: 'BeetleSense lägger till realtidsintelligens ovanpå din statiska skogsplan och hjälper dig anpassa prioriteringar dynamiskt.',
      },
    ],
  },

  // ─── 2. Common Swedish Tree Species ───
  {
    id: 'tree-species',
    title_en: 'How to Identify Common Swedish Tree Species',
    title_sv: 'Identifiera vanliga svenska trädslag',
    description_en: 'A quick field guide to the most common trees in Swedish forests — spruce, pine, birch, and more.',
    description_sv: 'En snabb fältguide till de vanligaste träden i svensk skog — gran, tall, björk och fler.',
    topic: 'tree_care',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    icon: 'TreePine',
    sections: [
      {
        title_en: 'Norway Spruce (Gran)',
        title_sv: 'Gran (Picea abies)',
        content_en: 'Norway spruce is Sweden\'s most common tree, covering about 40% of forest land. It has:\n\n- **Needles**: Short (1-2 cm), dark green, growing all around the twig\n- **Bark**: Thin, reddish-brown when young; grey and scaly when old\n- **Shape**: Classic Christmas tree pyramid shape\n- **Cones**: Long (10-15 cm), hanging downward\n\nSpruce prefers moist, nutrient-rich soils and is the primary target of the bark beetle (granbarkborre). It has shallow roots, making it vulnerable to storm damage.',
        content_sv: 'Gran är Sveriges vanligaste träd och täcker cirka 40% av skogsmarken. Den har:\n\n- **Barr**: Korta (1-2 cm), mörkgröna, växer runt hela kvisten\n- **Bark**: Tunn, rödbrunt som ung; grå och fjällig som gammal\n- **Form**: Klassisk julgransform, pyramidformad\n- **Kottar**: Långa (10-15 cm), hänger nedåt\n\nGran föredrar fuktig, näringsrik mark och är det primära målet för granbarkborren. Den har ytliga rötter, vilket gör den sårbar för stormskador.',
        keyTakeaway_en: 'Spruce covers 40% of Swedish forests, has short dark needles, and is the primary bark beetle target.',
        keyTakeaway_sv: 'Gran täcker 40% av svensk skog, har korta mörka barr och är granbarkborrens primära mål.',
        quiz: {
          question_en: 'Which tree species is the primary target of granbarkborren?',
          question_sv: 'Vilket trädslag är granbarkborrens primära mål?',
          options: [
            { id: 'a', text_en: 'Scots Pine', text_sv: 'Tall' },
            { id: 'b', text_en: 'Norway Spruce', text_sv: 'Gran' },
            { id: 'c', text_en: 'Silver Birch', text_sv: 'Björk' },
          ],
          correctOptionId: 'b',
          explanation_en: 'The European spruce bark beetle (Ips typographus) primarily attacks Norway spruce (Picea abies).',
          explanation_sv: 'Granbarkborren (Ips typographus) angriper främst gran (Picea abies).',
        },
      },
      {
        title_en: 'Scots Pine (Tall)',
        title_sv: 'Tall (Pinus sylvestris)',
        content_en: 'Scots pine is Sweden\'s second most common tree (~39% of forest land). Key features:\n\n- **Needles**: Long (4-7 cm), in pairs, blue-green\n- **Bark**: Lower trunk is dark and fissured; upper trunk and branches are distinctive orange-red\n- **Shape**: Irregular crown, often flat-topped in older trees\n- **Cones**: Small (3-5 cm), round\n\nPine thrives on drier, sandier soils. It is more resistant to bark beetles than spruce but can be affected by other pests like the pine weevil (snytbagge).',
        content_sv: 'Tall är Sveriges näst vanligaste träd (~39% av skogsmarken). Kännetecken:\n\n- **Barr**: Långa (4-7 cm), i par, blågröna\n- **Bark**: Nedre stammen mörk och fårad; övre stammen och grenarna karakteristiskt orangeröda\n- **Form**: Oregelbunden krona, ofta plattoppad hos äldre träd\n- **Kottar**: Små (3-5 cm), runda\n\nTall trivs på torrare, sandigare jordar. Den är mer motståndskraftig mot barkborrar än gran men kan påverkas av andra skadedjur som snytbagge.',
        keyTakeaway_en: 'Pine has long paired needles, orange-red upper bark, and prefers dry sandy soils.',
        keyTakeaway_sv: 'Tall har långa pariga barr, orangeröd övre bark och föredrar torr sandig mark.',
      },
      {
        title_en: 'Birch, Oak, and Others',
        title_sv: 'Björk, ek och andra',
        content_en: 'Broadleaf trees make up about 12% of Swedish forests:\n\n- **Silver Birch** (Vårtbjörk): White bark, diamond-shaped leaves, pioneer species\n- **Downy Birch** (Glasbjörk): Similar but prefers wetter soil\n- **Oak** (Ek): Lobed leaves, very long-lived, valuable timber\n- **Beech** (Bok): Smooth grey bark, found mainly in southern Sweden\n- **Aspen** (Asp): Round leaves that tremble in wind, good for biodiversity\n\nMixed forests with broadleaf species are more resilient against pests and climate change.',
        content_sv: 'Lövträd utgör cirka 12% av svensk skog:\n\n- **Vårtbjörk**: Vit bark, diamantformade blad, pionjärart\n- **Glasbjörk**: Liknande men föredrar fuktigare mark\n- **Ek**: Flikiga blad, mycket långlivad, värdefullt virke\n- **Bok**: Slät grå bark, finns främst i södra Sverige\n- **Asp**: Runda blad som darrar i vinden, bra för biologisk mångfald\n\nBlandskogar med lövträd är mer motståndskraftiga mot skadedjur och klimatförändringar.',
        keyTakeaway_en: 'Mixed forests with broadleaf species increase resilience. Birch, oak, and aspen are the most common broadleaves.',
        keyTakeaway_sv: 'Blandskogar med lövträd ökar motståndskraften. Björk, ek och asp är de vanligaste lövträden.',
      },
    ],
  },

  // ─── 3. Spotting Bark Beetle Damage ───
  {
    id: 'bark-beetle-visual',
    title_en: 'Spotting Bark Beetle Damage — A Visual Guide',
    title_sv: 'Upptäck barkborreskador — en visuell guide',
    description_en: 'Learn the telltale signs of bark beetle attack so you can catch infestations early.',
    description_sv: 'Lär dig de typiska tecknen på barkborreangrepp så att du kan upptäcka angrepp tidigt.',
    topic: 'pest_management',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    icon: 'Bug',
    sections: [
      {
        title_en: 'Early Signs of Attack',
        title_sv: 'Tidiga tecken på angrepp',
        content_en: 'The sooner you spot a bark beetle attack, the better your chances of limiting damage. Early signs include:\n\n- **Brown boring dust** (borrmjöl): Fine reddish-brown sawdust at the base of the tree or in bark crevices. This is the #1 early indicator.\n- **Small entry holes**: Tiny round holes (1-2 mm) in the bark, often in the lower crown area.\n- **Resin flow**: Fresh resin bleeding from entry points — the tree\'s defense mechanism.\n- **Woodpecker activity**: Increased woodpecker activity on a tree suggests beetles are present beneath the bark.\n\nDuring spring swarming season (typically May-June), inspect spruce trees regularly, especially edges of recent clear-cuts and storm-damaged areas.',
        content_sv: 'Ju tidigare du upptäcker ett barkborreangrepp, desto bättre chanser att begränsa skadan. Tidiga tecken inkluderar:\n\n- **Brunt borrmjöl**: Fint rödbrunt sågspån vid trädets bas eller i barksprickor. Detta är det främsta tidiga tecknet.\n- **Små ingångshål**: Pyttesmå runda hål (1-2 mm) i barken, ofta i nedre kronområdet.\n- **Kådflöde**: Färsk kåda som blöder från ingångspunkter — trädets försvarsmekanism.\n- **Hackspettaktivitet**: Ökad hackspettaktivitet på ett träd tyder på att barkborrar finns under barken.\n\nUnder vårens svärmningssäsong (vanligtvis maj-juni), inspektera granar regelbundet, särskilt kanterna av nyliga hyggen och stormskadade områden.',
        keyTakeaway_en: 'Brown boring dust at the tree base is the #1 early sign of bark beetle attack. Check spruce trees regularly during May-June.',
        keyTakeaway_sv: 'Brunt borrmjöl vid trädets bas är det främsta tidiga tecknet på barkborreangrepp. Kontrollera granar regelbundet under maj-juni.',
        quiz: {
          question_en: 'What is the most reliable early indicator of bark beetle attack?',
          question_sv: 'Vad är det mest pålitliga tidiga tecknet på barkborreangrepp?',
          options: [
            { id: 'a', text_en: 'Yellow needles', text_sv: 'Gula barr' },
            { id: 'b', text_en: 'Brown boring dust at tree base', text_sv: 'Brunt borrmjöl vid trädets bas' },
            { id: 'c', text_en: 'Falling bark', text_sv: 'Lossande bark' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Brown boring dust (borrmjöl) is the earliest and most reliable visual sign of active bark beetle boring.',
          explanation_sv: 'Brunt borrmjöl är det tidigaste och mest pålitliga visuella tecknet på aktiv barkborreborrning.',
        },
      },
      {
        title_en: 'Advanced Damage Signs',
        title_sv: 'Avancerade skadetecken',
        content_en: 'As an infestation progresses, more obvious signs appear:\n\n- **Crown discoloration**: Needles turn yellow-green, then red-brown. By this stage the tree is usually beyond saving.\n- **Bark falling off**: Loose bark that easily peels away reveals the characteristic gallery patterns underneath.\n- **Gallery patterns**: S-shaped mother galleries with perpendicular larval galleries etched into the wood surface.\n- **Exit holes**: Numerous small holes where new adult beetles have emerged.\n\nA single infested tree can produce 100,000+ new beetles in one season. Rapid removal of infested trees (within weeks) is critical to prevent exponential spread.',
        content_sv: 'När ett angrepp fortskrider uppträder tydligare tecken:\n\n- **Kronmissfärgning**: Barren blir gulgrön, sedan rödbruna. I detta stadium är trädet vanligtvis bortom räddning.\n- **Bark som lossnar**: Lös bark som lätt lossnar avslöjar de karakteristiska gångmönstren undertill.\n- **Gångmönster**: S-formade modergångar med vinkelräta larvgångar inristade i vedytan.\n- **Utgångshål**: Talrika små hål där nya vuxna barkborrar har kläckts.\n\nEtt enda angripet träd kan producera 100 000+ nya barkborrar under en säsong. Snabb borttagning av angripna träd (inom veckor) är avgörande för att förhindra exponentiell spridning.',
        keyTakeaway_en: 'One infested tree can produce 100,000+ new beetles. Remove infested trees within weeks to prevent spread.',
        keyTakeaway_sv: 'Ett angripet träd kan producera 100 000+ nya barkborrar. Ta bort angripna träd inom veckor för att förhindra spridning.',
      },
      {
        title_en: 'Using BeetleSense for Detection',
        title_sv: 'Använda BeetleSense för detektion',
        content_en: 'BeetleSense combines multiple detection methods:\n\n- **Satellite NDVI**: Detects canopy stress before visible symptoms appear\n- **Drone imagery**: High-resolution photos analyzed by AI to spot boring dust and crown changes\n- **Vision Search**: Use your phone camera in the field to identify damage instantly\n- **Alerts**: Automatic notifications when risk conditions (warm + dry weather) or detected changes occur\n\nThe platform can detect stress patterns 2-4 weeks before the human eye can spot them, giving you a critical head start.',
        content_sv: 'BeetleSense kombinerar flera detektionsmetoder:\n\n- **Satellit-NDVI**: Upptäcker kronträdsstress innan synliga symptom uppträder\n- **Drönarbilder**: Högupplösta foton analyserade av AI för att upptäcka borrmjöl och kronförändringar\n- **Bildsökning**: Använd din telefonkamera i fält för att identifiera skador direkt\n- **Aviseringar**: Automatiska varningar när riskförhållanden (varmt + torrt väder) eller upptäckta förändringar inträffar\n\nPlattformen kan upptäcka stressmönster 2-4 veckor innan det mänskliga ögat kan se dem, vilket ger dig ett kritiskt försprång.',
        keyTakeaway_en: 'BeetleSense detects canopy stress 2-4 weeks before symptoms are visible to the naked eye.',
        keyTakeaway_sv: 'BeetleSense upptäcker kronträdsstress 2-4 veckor innan symptom syns med blotta ögat.',
      },
    ],
  },

  // ─── 4. When and Why to Thin Your Forest ───
  {
    id: 'thinning-basics',
    title_en: 'When and Why to Thin Your Forest',
    title_sv: 'När och varför du ska gallra din skog',
    description_en: 'Thinning is one of the most impactful operations. Learn when, why, and how to thin correctly.',
    description_sv: 'Gallring är en av de mest betydelsefulla åtgärderna. Lär dig när, varför och hur du gallrar rätt.',
    topic: 'tree_care',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    icon: 'Axe',
    sections: [
      {
        title_en: 'Why Thin?',
        title_sv: 'Varför gallra?',
        content_en: 'Thinning removes selected trees to give remaining trees more light, water, and nutrients. Benefits include:\n\n- **Faster growth**: Remaining trees grow thicker trunks faster, producing more valuable sawlog timber\n- **Better health**: Reduced competition means stronger, more resilient trees\n- **Storm resistance**: Well-thinned stands with developed root systems are more wind-resistant\n- **Income**: Thinning produces timber that can be sold, offsetting forest management costs\n- **Biodiversity**: Opening the canopy allows ground vegetation and wildlife to thrive\n\nIn Sweden, a typical rotation involves 1-3 thinning operations before final harvest.',
        content_sv: 'Gallring tar bort utvalda träd för att ge kvarvarande träd mer ljus, vatten och näring. Fördelar inkluderar:\n\n- **Snabbare tillväxt**: Kvarvarande träd växer tjockare stammar snabbare och producerar mer värdefullt sågvirke\n- **Bättre hälsa**: Minskad konkurrens innebär starkare, mer motståndskraftiga träd\n- **Stormtålighet**: Välgallrade bestånd med utvecklade rotsystem är mer vindtåliga\n- **Inkomst**: Gallring ger virke som kan säljas och kompenserar skogsvårdskostnader\n- **Biologisk mångfald**: Öppnare krontak låter markvegetation och djurliv frodas\n\nI Sverige involverar en typisk omloppstid 1-3 gallringar före slutavverkning.',
        keyTakeaway_en: 'Thinning boosts growth, health, storm resistance, and generates income. Swedish rotations include 1-3 thinnings.',
        keyTakeaway_sv: 'Gallring ökar tillväxt, hälsa, stormtålighet och genererar inkomster. Svensk omloppstid inkluderar 1-3 gallringar.',
      },
      {
        title_en: 'When to Thin',
        title_sv: 'När ska man gallra',
        content_en: 'Timing depends on species and growth:\n\n- **First thinning**: When dominant height reaches 12-15 m (spruce) or 11-13 m (pine), typically age 25-35\n- **Subsequent thinnings**: Every 8-12 years until final harvest\n- **Season**: Prefer winter (frozen ground) to minimize soil damage. Summer thinning is acceptable but increases bark beetle risk for spruce.\n- **Avoid**: Thinning during bark beetle swarming season (May-July) in spruce stands\n\nYour skogsbruksplan will specify recommended thinning timing for each stand. BeetleSense alerts you when conditions are optimal.',
        content_sv: 'Tidpunkten beror på trädslag och tillväxt:\n\n- **Första gallring**: När övre höjd når 12-15 m (gran) eller 11-13 m (tall), typiskt ålder 25-35\n- **Efterföljande gallringar**: Var 8-12 år till slutavverkning\n- **Säsong**: Föredra vinter (frusen mark) för att minimera markskador. Sommargallring är acceptabel men ökar barkborrerisken för gran.\n- **Undvik**: Gallring under barkborrarnas svärmningstid (maj-juli) i granbestånd\n\nDin skogsbruksplan anger rekommenderade gallringstidpunkter för varje avdelning. BeetleSense varnar dig när förhållandena är optimala.',
        keyTakeaway_en: 'First thin when trees reach 12-15m. Prefer winter to protect soil. Avoid May-July in spruce stands.',
        keyTakeaway_sv: 'Första gallring när träden når 12-15m. Föredra vinter för att skydda marken. Undvik maj-juli i granbestånd.',
        quiz: {
          question_en: 'Why should you avoid thinning spruce in May-July?',
          question_sv: 'Varför bör man undvika att gallra gran i maj-juli?',
          options: [
            { id: 'a', text_en: 'Trees grow too fast', text_sv: 'Träden växer för snabbt' },
            { id: 'b', text_en: 'Bark beetle swarming risk', text_sv: 'Risk för barkborresvärmning' },
            { id: 'c', text_en: 'Too much rain', text_sv: 'För mycket regn' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Fresh-cut spruce stumps and damaged trees during swarming season attract bark beetles.',
          explanation_sv: 'Nyhuggen granved och skadade träd under svärmningstiden attraherar barkborrar.',
        },
      },
      {
        title_en: 'How to Thin Correctly',
        title_sv: 'Hur man gallrar rätt',
        content_en: 'Key principles for successful thinning:\n\n- **Thin from below**: Remove smaller, suppressed trees first. Keep the best-formed dominant trees.\n- **Target density**: Remove 25-35% of standing volume per thinning\n- **Leave buffer zones**: Keep unthinned strips along waterways and sensitive areas\n- **Mark before cutting**: Walk through the stand and mark trees to remove before machinery arrives\n- **Minimize soil damage**: Use designated strip roads (stickvägar) spaced ~20m apart\n\nPoor thinning (too aggressive or wrong timing) can cause wind damage and increased pest vulnerability.',
        content_sv: 'Nyckelprinciper för framgångsrik gallring:\n\n- **Gallra underifrån**: Ta bort mindre, undertryckta träd först. Behåll de bäst formade dominerande träden.\n- **Måltäthet**: Ta bort 25-35% av stående volym per gallring\n- **Lämna buffertzoner**: Behåll ogallrade remsor längs vattendrag och känsliga områden\n- **Märk före avverkning**: Gå igenom beståndet och märk träd som ska tas bort innan maskinerna kommer\n- **Minimera markskador**: Använd anvisade stickvägar med ~20m avstånd\n\nFelaktig gallring (för aggressiv eller fel tidpunkt) kan orsaka vindskador och ökad skadedjurskänslighet.',
        keyTakeaway_en: 'Remove 25-35% of volume, thin from below, use strip roads, and always leave buffer zones near water.',
        keyTakeaway_sv: 'Ta bort 25-35% av volymen, gallra underifrån, använd stickvägar och lämna alltid buffertzoner nära vatten.',
      },
    ],
  },

  // ─── 5. Swedish Forest Tax Basics ───
  {
    id: 'forest-tax',
    title_en: 'Swedish Forest Tax Basics — Skogskonto Explained',
    title_sv: 'Skogsbeskattning — skogskonto förklarat',
    description_en: 'Understand the Swedish forest tax system, skogskonto, and how to optimize your tax planning.',
    description_sv: 'Förstå det svenska skogsskattesystemet, skogskonto och hur du optimerar din skatteplanering.',
    topic: 'legal_tax',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    icon: 'Receipt',
    sections: [
      {
        title_en: 'How Forest Income Is Taxed',
        title_sv: 'Hur skogsinkomster beskattas',
        content_en: 'In Sweden, forest income is taxed as business income (näringsverksamhet). Key concepts:\n\n- **Timber sales** are your primary revenue and are fully taxable\n- **Active vs. passive**: If you actively manage your forest (>100 hours/year), it counts as active business income — this affects your social security contributions\n- **Deductible expenses**: Planting, thinning, road maintenance, management plans, and BeetleSense subscriptions are all deductible\n- **VAT**: Most forest owners register for VAT (moms), allowing you to deduct VAT on purchases\n\nForest income can be highly variable — big revenue in harvest years, little in others. Swedish tax law provides tools to smooth this out.',
        content_sv: 'I Sverige beskattas skogsinkomster som näringsinkomst. Nyckelbegrepp:\n\n- **Virkesförsäljning** är din primära intäkt och är fullt beskattningsbar\n- **Aktiv vs. passiv**: Om du aktivt förvaltar din skog (>100 timmar/år) räknas det som aktiv näringsinkomst — detta påverkar dina socialavgifter\n- **Avdragsgilla utgifter**: Plantering, gallring, vägunderhåll, skogsbruksplaner och BeetleSense-prenumerationer är alla avdragsgilla\n- **Moms**: De flesta skogsägare registrerar sig för moms, vilket gör att du kan dra av moms på inköp\n\nSkogsinkomster kan variera kraftigt — stora intäkter i avverkningsår, lite i andra. Svensk skattelagstiftning erbjuder verktyg för att jämna ut detta.',
        keyTakeaway_en: 'Forest income is taxed as business income. Management costs including subscriptions are tax-deductible.',
        keyTakeaway_sv: 'Skogsinkomst beskattas som näringsinkomst. Förvaltningskostnader inklusive prenumerationer är avdragsgilla.',
      },
      {
        title_en: 'Skogskonto — Income Smoothing',
        title_sv: 'Skogskonto — inkomstutjämning',
        content_en: 'The **skogskonto** is a special bank account that lets you defer forest income taxation:\n\n- Deposit 20-80% of timber sale revenue into a skogskonto\n- Money must stay for at least 4 years\n- Withdrawals are taxed as income in the year withdrawn\n- You can spread large harvest incomes over many years, avoiding high marginal tax rates\n\nExample: You sell timber for 500,000 kr. Instead of paying tax on the full amount, you deposit 400,000 kr into skogskonto. You pay tax only on 100,000 kr this year, and withdraw the rest gradually over future years at lower tax rates.',
        content_sv: 'Skogskontot är ett speciellt bankkonto som låter dig skjuta upp beskattning av skogsinkomster:\n\n- Sätt in 20-80% av virkesförsäljningsintäkter på ett skogskonto\n- Pengarna måste stå minst 4 år\n- Uttag beskattas som inkomst det år de tas ut\n- Du kan fördela stora avverkningsinkomster över många år och undvika höga marginalskatter\n\nExempel: Du säljer virke för 500 000 kr. Istället för att betala skatt på hela beloppet sätter du in 400 000 kr på skogskonto. Du betalar skatt bara på 100 000 kr i år och tar ut resten gradvis under kommande år med lägre skattesatser.',
        keyTakeaway_en: 'Skogskonto lets you deposit 20-80% of timber income and defer tax for at least 4 years.',
        keyTakeaway_sv: 'Skogskonto låter dig sätta in 20-80% av virkesintäkterna och skjuta upp skatten i minst 4 år.',
        quiz: {
          question_en: 'What percentage of timber revenue can you deposit into a skogskonto?',
          question_sv: 'Hur stor andel av virkesintäkterna kan du sätta in på ett skogskonto?',
          options: [
            { id: 'a', text_en: '10-50%', text_sv: '10-50%' },
            { id: 'b', text_en: '20-80%', text_sv: '20-80%' },
            { id: 'c', text_en: '50-100%', text_sv: '50-100%' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Swedish tax law allows depositing 20-80% of timber sale revenue into a skogskonto.',
          explanation_sv: 'Svensk skattelag tillåter insättning av 20-80% av virkesförsäljningsintäkter på skogskonto.',
        },
      },
      {
        title_en: 'Other Tax Tools',
        title_sv: 'Andra skatteverktyg',
        content_en: 'Beyond skogskonto, Swedish forest owners have additional tax tools:\n\n- **Räntefördelning**: Allocate some income as capital income (taxed at 30%) instead of business income (up to ~55%)\n- **Periodiseringsfond**: Set aside up to 30% of profit, defer for 6 years\n- **Skogsavdrag**: Deduct 50% of acquisition cost for purchased forest land (max 50% of timber income per year)\n- **Expansionsfond**: Retain profits in the business at a lower tax rate (20.6%)\n\nConsult a forest accountant (skogsredovisare) familiar with these tools. The tax savings can be substantial.',
        content_sv: 'Utöver skogskonto har svenska skogsägare ytterligare skatteverktyg:\n\n- **Räntefördelning**: Fördela viss inkomst som kapitalinkomst (beskattas med 30%) istället för näringsinkomst (upp till ~55%)\n- **Periodiseringsfond**: Avsätt upp till 30% av vinsten, skjut upp i 6 år\n- **Skogsavdrag**: Dra av 50% av anskaffningskostnaden för köpt skogsmark (max 50% av virkesintäkten per år)\n- **Expansionsfond**: Behåll vinst i verksamheten till lägre skattesats (20,6%)\n\nRådfråga en skogsredovisare som kan dessa verktyg. Skattebesparingarna kan bli betydande.',
        keyTakeaway_en: 'Combine skogskonto with räntefördelning and periodiseringsfond to significantly reduce your tax burden.',
        keyTakeaway_sv: 'Kombinera skogskonto med räntefördelning och periodiseringsfond för att minska din skattebörda avsevärt.',
      },
    ],
  },

  // ─── 6. Reading Satellite Health Maps ───
  {
    id: 'satellite-maps',
    title_en: 'Reading Satellite Health Maps',
    title_sv: 'Läsa satellithälsokartor',
    description_en: 'Understand NDVI, false color imagery, and what satellite data tells you about your forest.',
    description_sv: 'Förstå NDVI, falskfärgsbilder och vad satellitdata berättar om din skog.',
    topic: 'getting_started',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    icon: 'Satellite',
    sections: [
      {
        title_en: 'What is NDVI?',
        title_sv: 'Vad är NDVI?',
        content_en: 'NDVI (Normalized Difference Vegetation Index) measures how green and healthy vegetation is by analyzing reflected light:\n\n- **Values range from -1 to +1**\n- **0.6-0.9**: Healthy, dense forest (shown in dark green)\n- **0.3-0.6**: Moderate vegetation, sparse canopy, or stressed forest (shown in yellow-green)\n- **0.1-0.3**: Bare soil, very sparse vegetation (shown in brown/red)\n- **Below 0.1**: Water, rock, or snow\n\nBeetleSense uses Sentinel-2 satellite data (free, updated every 5 days) to calculate NDVI across your parcels. A sudden NDVI drop can indicate pest damage, drought stress, or illegal harvesting.',
        content_sv: 'NDVI (Normalized Difference Vegetation Index) mäter hur grön och frisk vegetationen är genom att analysera reflekterat ljus:\n\n- **Värden från -1 till +1**\n- **0,6-0,9**: Frisk, tät skog (visas i mörkgrönt)\n- **0,3-0,6**: Måttlig vegetation, gles krona eller stressad skog (visas i gulgrön)\n- **0,1-0,3**: Bar mark, mycket gles vegetation (visas i brunt/rött)\n- **Under 0,1**: Vatten, berg eller snö\n\nBeetleSense använder Sentinel-2-satellitdata (gratis, uppdateras var 5:e dag) för att beräkna NDVI över dina skiften. Ett plötsligt NDVI-fall kan indikera skadedjursskador, torkstress eller olaglig avverkning.',
        keyTakeaway_en: 'NDVI values 0.6-0.9 indicate healthy forest. A sudden drop signals stress, pest damage, or harvest activity.',
        keyTakeaway_sv: 'NDVI-värden 0,6-0,9 indikerar frisk skog. Ett plötsligt fall signalerar stress, skadedjursskada eller avverkning.',
        quiz: {
          question_en: 'What NDVI range indicates healthy dense forest?',
          question_sv: 'Vilket NDVI-intervall indikerar frisk tät skog?',
          options: [
            { id: 'a', text_en: '0.1-0.3', text_sv: '0,1-0,3' },
            { id: 'b', text_en: '0.3-0.6', text_sv: '0,3-0,6' },
            { id: 'c', text_en: '0.6-0.9', text_sv: '0,6-0,9' },
          ],
          correctOptionId: 'c',
          explanation_en: 'NDVI values between 0.6 and 0.9 indicate healthy, photosynthetically active dense forest canopy.',
          explanation_sv: 'NDVI-värden mellan 0,6 och 0,9 indikerar frisk, fotosyntetiskt aktiv tät skogskrona.',
        },
      },
      {
        title_en: 'Interpreting Color Maps',
        title_sv: 'Tolka färgkartor',
        content_en: 'BeetleSense presents satellite data in several visual layers:\n\n- **NDVI layer**: Green = healthy, yellow = moderate, red = stressed/damaged\n- **Change detection**: Shows where NDVI has increased (blue) or decreased (red) compared to previous period\n- **Risk zones**: AI-generated overlay combining NDVI trends, weather data, and beetle population models\n\nWhen reviewing your map, look for:\n1. Red patches in previously green areas — possible new damage\n2. Gradual yellowing — drought or disease stress\n3. Sharp boundaries — could indicate harvesting activity (yours or neighbor\'s)',
        content_sv: 'BeetleSense presenterar satellitdata i flera visuella lager:\n\n- **NDVI-lager**: Grönt = friskt, gult = måttligt, rött = stressat/skadat\n- **Förändringsdetektering**: Visar var NDVI har ökat (blått) eller minskat (rött) jämfört med föregående period\n- **Riskzoner**: AI-genererat överlägg som kombinerar NDVI-trender, väderdata och barkborrepopulationsmodeller\n\nNär du granskar din karta, leta efter:\n1. Röda fläckar i tidigare gröna områden — möjlig ny skada\n2. Gradvis gulning — torka eller sjukdomsstress\n3. Skarpa gränser — kan indikera avverkningsaktivitet (din eller grannens)',
        keyTakeaway_en: 'Red patches in green areas signal new damage. Use change detection to spot trends over time.',
        keyTakeaway_sv: 'Röda fläckar i gröna områden signalerar ny skada. Använd förändringsdetektering för att upptäcka trender.',
      },
    ],
  },

  // ─── 7. Rights and Obligations ───
  {
    id: 'rights-obligations',
    title_en: 'Your Rights and Obligations as a Forest Owner',
    title_sv: 'Dina rättigheter och skyldigheter som skogsägare',
    description_en: 'Key Swedish forestry laws every owner must know — from Skogsvårdslagen to harvesting rules.',
    description_sv: 'Viktiga svenska skogslagar som varje ägare måste känna till — från Skogsvårdslagen till avverkningsregler.',
    topic: 'legal_tax',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    icon: 'Scale',
    sections: [
      {
        title_en: 'Skogsvårdslagen — The Forestry Act',
        title_sv: 'Skogsvårdslagen',
        content_en: 'The Swedish Forestry Act (Skogsvårdslagen, SFS 1979:429) is the primary law governing private forest management. Its dual objectives are:\n\n1. **Production goal** (Produktionsmål): Forests should be managed to provide a sustainable yield of timber and other products\n2. **Environmental goal** (Miljömål): Forest management must consider biodiversity, cultural heritage, and ecosystem services\n\nThese two goals are equally weighted. You have the right to harvest and profit from your forest, but you also have obligations to replant, protect key habitats, and manage sustainably.',
        content_sv: 'Skogsvårdslagen (SFS 1979:429) är den primära lagen som styr privat skogsförvaltning. Dess dubbla mål är:\n\n1. **Produktionsmål**: Skogen ska förvaltas för att ge en uthållig avkastning av virke och andra produkter\n2. **Miljömål**: Skogsbruket ska ta hänsyn till biologisk mångfald, kulturarv och ekosystemtjänster\n\nDessa två mål är likvärdiga. Du har rätt att avverka och dra nytta av din skog, men du har också skyldigheter att återplantera, skydda nyckelbiotoper och förvalta hållbart.',
        keyTakeaway_en: 'Swedish forestry law has equal production and environmental goals. You must balance harvesting with conservation.',
        keyTakeaway_sv: 'Svensk skogslagstiftning har likvärdiga produktions- och miljömål. Du måste balansera avverkning med naturvård.',
      },
      {
        title_en: 'Harvesting Notifications',
        title_sv: 'Avverkningsanmälan',
        content_en: 'Before harvesting, you must notify Skogsstyrelsen:\n\n- **Avverkningsanmälan**: Required 6 weeks before any final harvest (slutavverkning) on areas > 0.5 hectares\n- **Submit online** via Skogsstyrelsen\'s portal or through your forest agent\n- **Include**: Area, species, volume, environmental considerations, and planned replanting\n- **Exemptions**: Thinning and sanitation cutting (removing damaged trees) usually don\'t require notification\n\nFailure to file can result in fines. BeetleSense tracks regulatory deadlines and reminds you when notifications are due.',
        content_sv: 'Innan avverkning måste du anmäla till Skogsstyrelsen:\n\n- **Avverkningsanmälan**: Krävs 6 veckor före slutavverkning på arealer > 0,5 hektar\n- **Anmäl online** via Skogsstyrelsens portal eller genom din skogliga rådgivare\n- **Inkludera**: Areal, trädslag, volym, miljöhänsyn och planerad återplantering\n- **Undantag**: Gallring och sanitetsavverkning (borttagning av skadade träd) kräver vanligtvis inte anmälan\n\nUtebliven anmälan kan resultera i böter. BeetleSense spårar regulatoriska deadlines och påminner dig när anmälningar ska göras.',
        keyTakeaway_en: 'File avverkningsanmälan 6 weeks before final harvest on areas > 0.5 ha. Thinning is usually exempt.',
        keyTakeaway_sv: 'Lämna avverkningsanmälan 6 veckor före slutavverkning på arealer > 0,5 ha. Gallring är vanligtvis undantagen.',
        quiz: {
          question_en: 'How far in advance must you file a harvest notification?',
          question_sv: 'Hur långt i förväg måste du lämna en avverkningsanmälan?',
          options: [
            { id: 'a', text_en: '2 weeks', text_sv: '2 veckor' },
            { id: 'b', text_en: '6 weeks', text_sv: '6 veckor' },
            { id: 'c', text_en: '6 months', text_sv: '6 månader' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Swedish law requires filing an avverkningsanmälan at least 6 weeks before final harvest operations begin.',
          explanation_sv: 'Svensk lag kräver att avverkningsanmälan lämnas minst 6 veckor före slutavverkning.',
        },
      },
      {
        title_en: 'Replanting and Environmental Obligations',
        title_sv: 'Återplantering och miljöskyldigheter',
        content_en: 'After harvesting, you have legal obligations:\n\n- **Replanting**: Must establish new forest within 3 years after final harvest. Planting or natural regeneration are both acceptable.\n- **Minimum density**: New stands must achieve adequate stocking within reasonable time\n- **Key habitats** (Nyckelbiotoper): Areas identified as having high conservation value must be protected\n- **Retention trees**: Leave 5-10% of trees standing during harvest for biodiversity (evighetsträd)\n- **Buffer zones**: Protect waterways with unharvested strips (typically 10-30m)\n- **Bark beetle obligation**: You are required to remove bark beetle-infested timber promptly to prevent spread\n\nSkogsstyrelsen inspects compliance and can issue orders if obligations are not met.',
        content_sv: 'Efter avverkning har du lagliga skyldigheter:\n\n- **Återplantering**: Måste etablera ny skog inom 3 år efter slutavverkning. Plantering eller naturlig föryngring är båda acceptabla.\n- **Minimitäthet**: Nya bestånd måste uppnå tillräcklig bestockning inom rimlig tid\n- **Nyckelbiotoper**: Områden identifierade som höga naturvärden måste skyddas\n- **Evighetsträd**: Lämna 5-10% av träden stående vid avverkning för biologisk mångfald\n- **Buffertzoner**: Skydda vattendrag med oharverade remsor (typiskt 10-30m)\n- **Barkborreskyldighet**: Du är skyldig att snabbt ta bort barkborreangripen skog för att förhindra spridning\n\nSkogsstyrelsen inspekterar efterlevnad och kan utfärda förelägganden om skyldigheter inte uppfylls.',
        keyTakeaway_en: 'Replant within 3 years, leave retention trees, protect waterways, and promptly remove beetle-infested timber.',
        keyTakeaway_sv: 'Återplantera inom 3 år, lämna evighetsträd, skydda vattendrag och ta snabbt bort barkborrangripen skog.',
      },
    ],
  },

  // ─── 8. Planning a Harvest Operation ───
  {
    id: 'harvest-planning',
    title_en: 'Planning a Harvest Operation',
    title_sv: 'Planera en avverkning',
    description_en: 'Step-by-step guide to planning, contracting, and executing a successful timber harvest.',
    description_sv: 'Steg-för-steg-guide för att planera, upphandla och genomföra en lyckad avverkning.',
    topic: 'operations',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    icon: 'ClipboardList',
    sections: [
      {
        title_en: 'Pre-Harvest Checklist',
        title_sv: 'Checklista före avverkning',
        content_en: 'Before any harvest operation, complete these steps:\n\n1. **Review your plan**: Check skogsbruksplan recommendations for the stand\n2. **File notification**: Submit avverkningsanmälan 6 weeks ahead (if final harvest)\n3. **Get offers**: Contact 2-3 timber buyers for competitive pricing\n4. **Check regulations**: Verify no nyckelbiotoper, Natura 2000, or strandskydd restrictions\n5. **Plan roads**: Ensure forest roads can handle heavy machinery and timber trucks\n6. **Mark boundaries**: Clearly mark harvest boundaries and retention zones\n7. **Seasonal timing**: Prefer frozen ground conditions; avoid beetle swarming season for spruce\n8. **Notify neighbors**: Good practice, especially for shared roads',
        content_sv: 'Innan varje avverkning, slutför dessa steg:\n\n1. **Granska din plan**: Kontrollera skogsbruksplanens rekommendationer för avdelningen\n2. **Lämna anmälan**: Lämna avverkningsanmälan 6 veckor i förväg (vid slutavverkning)\n3. **Begär offerter**: Kontakta 2-3 virkesköpare för konkurrenskraftiga priser\n4. **Kontrollera regler**: Verifiera inga nyckelbiotoper, Natura 2000 eller strandskyddsrestriktioner\n5. **Planera vägar**: Säkerställ att skogsbilvägar klarar tunga maskiner och virkesbillar\n6. **Märk gränser**: Markera tydligt avverkningsgränser och hänsynsytor\n7. **Säsongsplanering**: Föredra frusen mark; undvik barkborrarnas svärmningssäsong för gran\n8. **Meddela grannar**: God sed, särskilt för delade vägar',
        keyTakeaway_en: 'Start planning 2-3 months ahead. File notification, get multiple offers, and verify regulatory constraints.',
        keyTakeaway_sv: 'Börja planera 2-3 månader i förväg. Lämna anmälan, begär flera offerter och verifiera regulatoriska begränsningar.',
      },
      {
        title_en: 'Choosing a Buyer and Contract Type',
        title_sv: 'Välja köpare och kontraktstyp',
        content_en: 'In Sweden, there are several ways to sell timber:\n\n- **Delivery sale** (Leveransvirke): You handle harvesting, buyer purchases at roadside. Best margins but requires machinery.\n- **Standing sale** (Rotpost/Avverkningsuppdrag): Buyer handles everything from harvesting to transport. Most common for private owners.\n- **Timber auction**: Competitive bidding for larger volumes\n\nKey contract terms to negotiate:\n- **Price per m³fub** (cubic meters solid under bark)\n- **Species premiums**: Sawlog vs. pulpwood pricing\n- **Quality bonuses**: Large-diameter and straight logs fetch premiums\n- **Road damage clause**: Who pays for road repairs\n- **Timeline**: When operations start and finish',
        content_sv: 'I Sverige finns flera sätt att sälja virke:\n\n- **Leveransvirke**: Du hanterar avverkningen, köparen köper vid bilväg. Bästa marginaler men kräver maskineri.\n- **Rotpost/Avverkningsuppdrag**: Köparen hanterar allt från avverkning till transport. Vanligast för privata ägare.\n- **Virkesauktion**: Konkurrensutsatt budgivning för större volymer\n\nViktiga avtalsvillkor att förhandla:\n- **Pris per m³fub** (kubikmeter fast under bark)\n- **Sortimentspriser**: Sågstock vs. massaved\n- **Kvalitetspremier**: Grovt och rakt virke ger premier\n- **Vägskadeklausul**: Vem betalar för vägreparationer\n- **Tidsplan**: När operationerna börjar och slutar',
        keyTakeaway_en: 'Standing sale is easiest for most owners. Always get 2-3 quotes and negotiate road damage clauses.',
        keyTakeaway_sv: 'Avverkningsuppdrag är enklast för de flesta ägare. Begär alltid 2-3 offerter och förhandla vägskadeklausuler.',
        quiz: {
          question_en: 'Which sale type is most common for private forest owners in Sweden?',
          question_sv: 'Vilken försäljningstyp är vanligast för privata skogsägare i Sverige?',
          options: [
            { id: 'a', text_en: 'Delivery sale (Leveransvirke)', text_sv: 'Leveransvirke' },
            { id: 'b', text_en: 'Standing sale (Avverkningsuppdrag)', text_sv: 'Avverkningsuppdrag' },
            { id: 'c', text_en: 'Timber auction', text_sv: 'Virkesauktion' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Standing sale (avverkningsuppdrag) where the buyer handles harvesting and transport is the most common option for private forest owners.',
          explanation_sv: 'Avverkningsuppdrag där köparen hanterar avverkning och transport är det vanligaste alternativet för privata skogsägare.',
        },
      },
      {
        title_en: 'During and After Harvest',
        title_sv: 'Under och efter avverkning',
        content_en: 'During the operation:\n- Visit the site regularly to verify work matches the plan\n- Ensure buffer zones and retention trees are respected\n- Document with photos (use BeetleSense Capture mode for GPS-tagged documentation)\n- Monitor soil conditions — halt operations if ground damage becomes excessive\n\nAfter the operation:\n- Walk the site within a week to assess results\n- Verify timber volumes match measurement reports (mätbesked)\n- Plan replanting (within 3 years for final harvest)\n- Schedule a drone survey via BeetleSense to document the post-harvest condition\n- File for skogsavdrag if applicable for tax purposes',
        content_sv: 'Under operationen:\n- Besök platsen regelbundet för att verifiera att arbetet matchar planen\n- Säkerställ att buffertzoner och evighetsträd respekteras\n- Dokumentera med foton (använd BeetleSense Fångstläge för GPS-taggad dokumentation)\n- Övervaka markförhållanden — stoppa operationer om markskador blir överdrivna\n\nEfter operationen:\n- Gå igenom platsen inom en vecka för att bedöma resultatet\n- Verifiera att virkesvolymer matchar mätbesked\n- Planera återplantering (inom 3 år vid slutavverkning)\n- Beställ en drönarundersökning via BeetleSense för att dokumentera förhållandena efter avverkning\n- Ansök om skogsavdrag om tillämpligt för skatteändamål',
        keyTakeaway_en: 'Visit regularly during operations, verify volumes via mätbesked, and plan replanting immediately after.',
        keyTakeaway_sv: 'Besök regelbundet under operationer, verifiera volymer via mätbesked och planera återplantering direkt efteråt.',
      },
    ],
  },

  // ─── 9. Timber Markets and Pricing ───
  {
    id: 'timber-markets',
    title_en: 'Understanding Timber Markets and Pricing',
    title_sv: 'Förstå virkesmarknaden och prissättning',
    description_en: 'How Swedish timber pricing works, key market drivers, and when to sell for the best return.',
    description_sv: 'Hur svensk virkesprissättning fungerar, viktiga marknadsdrivkrafter och när du bör sälja för bäst avkastning.',
    topic: 'operations',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    icon: 'TrendingUp',
    sections: [
      {
        title_en: 'How Timber Is Priced',
        title_sv: 'Hur virke prissätts',
        content_en: 'Swedish timber pricing depends on:\n\n- **Sortiment** (assortment): Sawlog (sågstock) is 2-3x more valuable than pulpwood (massaved)\n- **Species**: Spruce sawlog and pine sawlog have different prices. Oak and other hardwoods command premium prices.\n- **Dimensions**: Larger diameter logs fetch higher prices. Minimum sawlog diameter is typically 18cm top end.\n- **Quality**: Straight, knot-free logs are premium. Beetle-damaged wood is heavily discounted.\n- **Location**: Prices vary by region, partly due to transport costs to nearest mill.\n\nPrices are published quarterly by Skogsstyrelsen and updated by regional forest owner associations (skogsägarföreningar).',
        content_sv: 'Svensk virkesprissättning beror på:\n\n- **Sortiment**: Sågstock är 2-3 gånger mer värdefullt än massaved\n- **Trädslag**: Gran- och tallsågstock har olika priser. Ek och andra lövträd ger premiumpriser.\n- **Dimensioner**: Grövre stockar ger högre pris. Minsta sågstocksdiameter är typiskt 18cm i topp.\n- **Kvalitet**: Raka, kvistfria stockar är premium. Barkborrenskadat virke diskonteras kraftigt.\n- **Plats**: Priser varierar regionalt, delvis på grund av transportkostnader till närmaste sågverk.\n\nPriser publiceras kvartalsvis av Skogsstyrelsen och uppdateras av regionala skogsägarföreningar.',
        keyTakeaway_en: 'Sawlog is 2-3x more valuable than pulpwood. Diameter, quality, and species determine price.',
        keyTakeaway_sv: 'Sågstock är 2-3 gånger mer värdefullt än massaved. Diameter, kvalitet och trädslag bestämmer priset.',
      },
      {
        title_en: 'Market Timing and Strategy',
        title_sv: 'Marknadstiming och strategi',
        content_en: 'Timber prices fluctuate based on supply and demand:\n\n- **Construction boom**: Drives up sawlog prices (spruce and pine)\n- **Storm damage**: Large storms flood the market, temporarily depressing prices\n- **Bark beetle outbreaks**: Same effect — salvage logging increases supply\n- **Export demand**: Chinese and Middle Eastern demand affects Swedish prices\n- **Seasonal patterns**: Prices tend to be higher in spring when sawmills ramp up\n\nStrategy tips:\n- Don\'t sell into a flooded market after storms unless your timber is at risk\n- Use skogskonto to time your taxable income independently of harvest timing\n- Join a forest owner association for better negotiating power\n- BeetleSense Timber Value estimates help you decide when to sell',
        content_sv: 'Virkespriser fluktuerar baserat på utbud och efterfrågan:\n\n- **Byggboom**: Driver upp sågstockspriser (gran och tall)\n- **Stormskador**: Stora stormar översvämmar marknaden och pressar tillfälligt priserna\n- **Barkborreutbrott**: Samma effekt — saneringsavverkning ökar utbudet\n- **Exportefterfrågan**: Kinesisk och mellanösternefterfrågan påverkar svenska priser\n- **Säsongsmönster**: Priser tenderar vara högre på våren när sågverken ökar produktionen\n\nStrategitips:\n- Sälj inte i en översvämad marknad efter stormar om inte ditt virke riskeras\n- Använd skogskonto för att tidsanpassa din beskattningsbara inkomst oberoende av avverkningstidpunkt\n- Gå med i en skogsägarförening för bättre förhandlingskraft\n- BeetleSense virkesvärdeskattning hjälper dig bestämma när du ska sälja',
        keyTakeaway_en: 'Avoid selling after storms. Join a forest owner association. Use skogskonto to decouple tax timing from market timing.',
        keyTakeaway_sv: 'Undvik att sälja efter stormar. Gå med i en skogsägarförening. Använd skogskonto för att frikoppla skattetiming från marknadstiming.',
      },
    ],
  },

  // ─── 10. Biodiversity in Your Forest ───
  {
    id: 'biodiversity',
    title_en: 'Biodiversity in Your Forest — Why It Matters',
    title_sv: 'Biologisk mångfald i din skog — varför det spelar roll',
    description_en: 'How biodiversity strengthens your forest and what practical steps you can take to promote it.',
    description_sv: 'Hur biologisk mångfald stärker din skog och vilka praktiska steg du kan ta för att främja den.',
    topic: 'climate_sustainability',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    icon: 'Leaf',
    sections: [
      {
        title_en: 'Why Biodiversity Matters Economically',
        title_sv: 'Varför biologisk mångfald spelar roll ekonomiskt',
        content_en: 'Biodiversity is not just an environmental nicety — it directly affects your forest\'s productivity and resilience:\n\n- **Pest resistance**: Mixed species forests are far less vulnerable to bark beetle outbreaks. Pure spruce monocultures are most at risk.\n- **Storm resilience**: Varied tree heights and species create more wind-resistant stands\n- **Soil health**: Different root systems and leaf litter improve nutrient cycling\n- **Climate adaptation**: Species diversity is insurance against changing conditions\n- **Certification premium**: FSC/PEFC-certified forests can command 5-15% price premiums\n\nSkogsstyrelsen research shows that biodiverse forests maintain or increase productivity while reducing management risks.',
        content_sv: 'Biologisk mångfald är inte bara en miljövänlig bonus — den påverkar direkt din skogs produktivitet och motståndskraft:\n\n- **Skadedjursresistens**: Blandskog är betydligt mindre sårbar för barkborreutbrott. Rena granmonokulturer är mest utsatta.\n- **Stormtålighet**: Varierade trädhöjder och arter skapar mer vindtåliga bestånd\n- **Markhälsa**: Olika rotsystem och förnafall förbättrar näringscirkulationen\n- **Klimatanpassning**: Artmångfald är en försäkring mot förändrade förhållanden\n- **Certifieringspremie**: FSC/PEFC-certifierade skogar kan ge 5-15% prispremier\n\nSkogsstyrelsens forskning visar att biodiverse skogar bibehåller eller ökar produktiviteten samtidigt som förvaltningsriskerna minskar.',
        keyTakeaway_en: 'Mixed forests resist pests better, tolerate storms, and can earn certification premiums of 5-15%.',
        keyTakeaway_sv: 'Blandskogar motstår skadedjur bättre, tål stormar och kan ge certifieringspremier på 5-15%.',
      },
      {
        title_en: 'Practical Steps to Increase Biodiversity',
        title_sv: 'Praktiska steg för att öka biologisk mångfald',
        content_en: 'Actions you can take today:\n\n1. **Leave dead wood**: Keep 5-10 dead trees per hectare (standing and fallen) — critical habitat for insects, fungi, and birds\n2. **Retain old trees**: Leave 5-10 large old trees per hectare during harvest (evighetsträd)\n3. **Protect waterways**: Maintain unharvested buffer zones (10-30m) along streams and wetlands\n4. **Mix species**: When replanting, include 10-20% broadleaf species (birch, oak, aspen)\n5. **Vary structure**: Don\'t thin uniformly — leave some dense patches and some open areas\n6. **Create edge zones**: Transition zones between forest and open areas benefit many species\n7. **Protect rare habitats**: Identify and avoid disturbing nyckelbiotoper\n\nThese actions satisfy both Skogsvårdslagen requirements and FSC/PEFC certification standards.',
        content_sv: 'Åtgärder du kan vidta idag:\n\n1. **Lämna död ved**: Behåll 5-10 döda träd per hektar (stående och liggande) — kritisk livsmiljö för insekter, svampar och fåglar\n2. **Behåll gamla träd**: Lämna 5-10 stora gamla träd per hektar vid avverkning (evighetsträd)\n3. **Skydda vattendrag**: Upprätthåll oharverade buffertzoner (10-30m) längs bäckar och våtmarker\n4. **Blanda arter**: Vid återplantering, inkludera 10-20% lövträd (björk, ek, asp)\n5. **Variera strukturen**: Gallra inte enhetligt — lämna några täta partier och några öppna ytor\n6. **Skapa kantzoner**: Övergångszoner mellan skog och öppen mark gynnar många arter\n7. **Skydda sällsynta biotoper**: Identifiera och undvik att störa nyckelbiotoper\n\nDessa åtgärder uppfyller både Skogsvårdslagens krav och FSC/PEFC-certifieringsstandarder.',
        keyTakeaway_en: 'Leave dead wood, retain old trees, protect waterways, and mix in 10-20% broadleaf when replanting.',
        keyTakeaway_sv: 'Lämna död ved, behåll gamla träd, skydda vattendrag och blanda in 10-20% lövträd vid återplantering.',
        quiz: {
          question_en: 'How many dead trees per hectare should you ideally leave?',
          question_sv: 'Hur många döda träd per hektar bör du helst lämna?',
          options: [
            { id: 'a', text_en: '1-2', text_sv: '1-2' },
            { id: 'b', text_en: '5-10', text_sv: '5-10' },
            { id: 'c', text_en: '20-30', text_sv: '20-30' },
          ],
          correctOptionId: 'b',
          explanation_en: '5-10 dead trees per hectare (standing and fallen) provide critical habitat for insects, fungi, woodpeckers, and other species.',
          explanation_sv: '5-10 döda träd per hektar (stående och liggande) ger kritisk livsmiljö för insekter, svampar, hackspettar och andra arter.',
        },
      },
    ],
  },

  // ─── 11. Climate Change and Your Forest ───
  {
    id: 'climate-change',
    title_en: 'Climate Change and Your Forest',
    title_sv: 'Klimatförändringar och din skog',
    description_en: 'How a warming climate impacts Swedish forests and what adaptation strategies to use.',
    description_sv: 'Hur ett varmare klimat påverkar svensk skog och vilka anpassningsstrategier du kan använda.',
    topic: 'climate_sustainability',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    icon: 'Thermometer',
    sections: [
      {
        title_en: 'Impacts on Swedish Forests',
        title_sv: 'Effekter på svensk skog',
        content_en: 'Climate change is already affecting Swedish forests:\n\n- **Longer growing seasons**: 2-4 weeks longer than 50 years ago, increasing growth potential\n- **More bark beetles**: Warmer summers allow two generations per year (previously one). The 2018-2020 outbreak destroyed 30+ million m³\n- **Increased storm damage**: More intense storms combined with less frozen ground increases wind-throw risk\n- **Drought stress**: Summer droughts weaken trees and make them vulnerable to secondary pests\n- **New pests**: Southern European pests moving northward\n- **Species shift**: Spruce becoming less viable in southern Sweden\n\nSLU projections suggest Swedish forests will grow faster overall, but risks increase dramatically — especially for spruce monocultures in southern Sweden.',
        content_sv: 'Klimatförändringar påverkar redan svensk skog:\n\n- **Längre växtsäsonger**: 2-4 veckor längre än för 50 år sedan, ökar tillväxtpotentialen\n- **Mer barkborrar**: Varmare somrar tillåter två generationer per år (tidigare en). Utbrottet 2018-2020 förstörde 30+ miljoner m³\n- **Ökade stormskador**: Intensivare stormar kombinerat med mindre tjäle ökar risken för stormfällning\n- **Torkstress**: Sommartorka försvagar träd och gör dem sårbara för sekundära skadedjur\n- **Nya skadedjur**: Sydeuropeiska skadedjur rör sig norrut\n- **Artförskjutning**: Gran blir mindre lämplig i södra Sverige\n\nSLU:s prognoser tyder på att svensk skog växer snabbare totalt, men riskerna ökar dramatiskt — särskilt för granmonokulturer i södra Sverige.',
        keyTakeaway_en: 'The 2018-2020 bark beetle outbreak destroyed 30+ million m³. Warming enables two beetle generations per year.',
        keyTakeaway_sv: 'Barkborreutbrottet 2018-2020 förstörde 30+ miljoner m³. Uppvärmning möjliggör två barkborregenerationer per år.',
      },
      {
        title_en: 'Adaptation Strategies',
        title_sv: 'Anpassningsstrategier',
        content_en: 'Practical steps to climate-proof your forest:\n\n1. **Diversify species**: Reduce spruce monoculture. Plant more pine, birch, oak, and larch.\n2. **Shorten rotation**: Consider harvesting spruce earlier to reduce beetle and storm exposure\n3. **Favor natural regeneration**: Locally adapted seed sources may be more resilient\n4. **Use southern provenances**: Plant trees from slightly southern seed sources to pre-adapt to warmer conditions\n5. **Improve drainage**: Maintain ditches to reduce waterlogging during wet periods\n6. **Monitor actively**: Use BeetleSense satellite monitoring to catch problems early\n7. **Build resilient edges**: Create graduated forest edges rather than sharp clear-cut boundaries\n\nThe Swedish Forest Agency recommends moving from spruce monocultures to mixed forests as the single most impactful adaptation.',
        content_sv: 'Praktiska steg för att klimatsäkra din skog:\n\n1. **Diversifiera arter**: Minska granmonokultur. Plantera mer tall, björk, ek och lärk.\n2. **Förkorta omloppstid**: Överväg att avverka gran tidigare för att minska barkborre- och stormexponering\n3. **Gynna naturlig föryngring**: Lokalt anpassade frökällor kan vara mer motståndskraftiga\n4. **Använd sydliga provenienser**: Plantera träd från sydligare frökällor för att föranpassa till varmare förhållanden\n5. **Förbättra dränering**: Underhåll diken för att minska vattensjukhet under blöta perioder\n6. **Övervaka aktivt**: Använd BeetleSense satellitövervakning för att fånga problem tidigt\n7. **Bygg motståndskraftiga kanter**: Skapa graderade skogskanter istället för skarpa hyggeskanter\n\nSkogsstyrelsen rekommenderar övergång från granmonokulturer till blandskog som den mest verkningsfulla anpassningen.',
        keyTakeaway_en: 'Move from spruce monocultures to mixed forests. This is the single most impactful climate adaptation.',
        keyTakeaway_sv: 'Gå från granmonokulturer till blandskog. Detta är den mest verkningsfulla klimatanpassningen.',
        quiz: {
          question_en: 'What is the most impactful climate adaptation for Swedish forests?',
          question_sv: 'Vad är den mest verkningsfulla klimatanpassningen för svensk skog?',
          options: [
            { id: 'a', text_en: 'Building taller fences', text_sv: 'Bygga högre stängsel' },
            { id: 'b', text_en: 'Moving from spruce monocultures to mixed forests', text_sv: 'Gå från granmonokulturer till blandskog' },
            { id: 'c', text_en: 'Harvesting less frequently', text_sv: 'Avverka mer sällan' },
          ],
          correctOptionId: 'b',
          explanation_en: 'Skogsstyrelsen recommends diversifying species away from spruce monocultures as the most effective climate adaptation strategy.',
          explanation_sv: 'Skogsstyrelsen rekommenderar att diversifiera arter bort från granmonokulturer som den mest effektiva klimatanpassningsstrategin.',
        },
      },
    ],
  },

  // ─── 12. Using Drones for Forest Monitoring ───
  {
    id: 'drone-monitoring',
    title_en: 'Using Drones for Forest Monitoring',
    title_sv: 'Använda drönare för skogsövervakning',
    description_en: 'How drone technology revolutionizes forest monitoring — from bark beetle detection to volume estimation.',
    description_sv: 'Hur drönarteknologi revolutionerar skogsövervakning — från barkborredetektion till volymuppskattning.',
    topic: 'operations',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    icon: 'Plane',
    sections: [
      {
        title_en: 'What Drones Can Detect',
        title_sv: 'Vad drönare kan detektera',
        content_en: 'Modern forestry drones equipped with specialized cameras can detect:\n\n- **Bark beetle damage**: RGB and multispectral cameras spot crown discoloration, boring dust, and stress patterns before visible to the naked eye\n- **Storm damage**: Rapidly survey large areas after storms to identify fallen trees\n- **Volume estimation**: Photogrammetry creates 3D models to estimate standing timber volume with ~90% accuracy\n- **Species mapping**: Multispectral imagery distinguishes tree species from above\n- **Growth monitoring**: Repeat flights track canopy changes over time\n\nBeetleSense uses AI to automatically analyze drone imagery, flagging areas of concern and generating actionable reports.',
        content_sv: 'Moderna skogsdrönare utrustade med specialkameror kan detektera:\n\n- **Barkborreskador**: RGB- och multispektrala kameror ser kronmissfärgning, borrmjöl och stressmönster innan de syns med blotta ögat\n- **Stormskador**: Snabb översikt av stora arealer efter stormar för att identifiera fällda träd\n- **Volymuppskattning**: Fotogrammetri skapar 3D-modeller för att uppskatta stående virkesvolym med ~90% noggrannhet\n- **Artkartering**: Multispektral bildbehandling skiljer trädarter uppifrån\n- **Tillväxtövervakning**: Upprepade flygningar spårar kronförändringar över tid\n\nBeetleSense använder AI för att automatiskt analysera drönarbilder, flaggar oroande områden och genererar handlingsbara rapporter.',
        keyTakeaway_en: 'Drones detect beetle damage earlier than the human eye and estimate timber volume with ~90% accuracy.',
        keyTakeaway_sv: 'Drönare detekterar barkborreskador tidigare än ögat och uppskattar virkesvolym med ~90% noggrannhet.',
      },
      {
        title_en: 'Ordering a Drone Survey',
        title_sv: 'Beställa en drönarundersökning',
        content_en: 'Through BeetleSense, ordering a drone survey is straightforward:\n\n1. **Select parcels**: Choose which parcels to survey from your dashboard\n2. **Choose survey type**: Quick scan (10 min/ha) or detailed analysis (30 min/ha)\n3. **Set priority**: Normal (within 2 weeks) or urgent (within 48 hours)\n4. **Certified pilots**: BeetleSense matches you with licensed drone pilots in your area\n5. **Automated analysis**: AI processes imagery within hours of flight completion\n6. **Report delivery**: Receive detailed health maps, damage assessments, and recommendations\n\nCosts typically range from 200-500 SEK per hectare depending on survey detail level. Compare this to the potential loss from undetected bark beetle damage (thousands of SEK per hectare).',
        content_sv: 'Genom BeetleSense är det enkelt att beställa en drönarundersökning:\n\n1. **Välj skiften**: Välj vilka skiften som ska undersökas från din översikt\n2. **Välj undersökningstyp**: Snabbskanning (10 min/ha) eller detaljerad analys (30 min/ha)\n3. **Ange prioritet**: Normal (inom 2 veckor) eller brådskande (inom 48 timmar)\n4. **Certifierade piloter**: BeetleSense matchar dig med licensierade drönarspiloter i ditt område\n5. **Automatiserad analys**: AI bearbetar bilder inom timmar efter flygning\n6. **Rapportleverans**: Få detaljerade hälsokartor, skadebedömningar och rekommendationer\n\nKostnader ligger typiskt mellan 200-500 SEK per hektar beroende på detaljnivå. Jämför detta med den potentiella förlusten från oupptäckt barkborreskada (tusentals SEK per hektar).',
        keyTakeaway_en: 'Drone surveys cost 200-500 SEK/ha — far less than potential losses from undetected beetle damage.',
        keyTakeaway_sv: 'Drönarundersökningar kostar 200-500 SEK/ha — betydligt mindre än potentiella förluster från oupptäckta barkborreskador.',
      },
    ],
  },

  // ─── 13. Advanced Beetle Management ───
  {
    id: 'advanced-beetle',
    title_en: 'Advanced Beetle Management Strategies',
    title_sv: 'Avancerade strategier för barkborrehantering',
    description_en: 'Go beyond basics — pheromone traps, sanitation cutting, landscape-level strategies, and integrated pest management.',
    description_sv: 'Gå bortom grunderna — feromonfällor, sanitetsavverkning, landskapsstrategier och integrerad skadedjursbekämpning.',
    topic: 'pest_management',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    icon: 'Shield',
    sections: [
      {
        title_en: 'Understanding Beetle Biology',
        title_sv: 'Förstå barkborrarnas biologi',
        content_en: 'To manage bark beetles effectively, understand their lifecycle:\n\n- **Spring swarming** (May-June): Adults emerge when temps exceed 18-20°C for several days. They fly to new host trees.\n- **Aggregation pheromones**: Pioneer beetles release chemicals that attract thousands more to the same tree\n- **Gallery construction**: Female bores under bark, lays eggs along a mother gallery. Larvae feed outward.\n- **Development time**: Egg to adult takes 6-10 weeks depending on temperature\n- **Second generation**: In warm years, a second generation swarms in July-August — this doubles population growth\n- **Overwintering**: Adults and late larvae overwinter under bark or in forest floor litter\n\nA single infested tree can produce 100,000+ beetles. Without intervention, populations can grow exponentially — 10x to 100x per year in outbreak conditions.',
        content_sv: 'För att hantera barkborrar effektivt, förstå deras livscykel:\n\n- **Vårsvärmning** (maj-juni): Vuxna kläcks när temperaturen överstiger 18-20°C flera dagar. De flyger till nya värdträd.\n- **Aggregationsferomoner**: Pionjärbaggar frisätter kemikalier som attraherar tusentals fler till samma träd\n- **Gångkonstruktion**: Honan borrar under barken, lägger ägg längs en modergång. Larverna äter sig utåt.\n- **Utvecklingstid**: Ägg till vuxen tar 6-10 veckor beroende på temperatur\n- **Andra generation**: Varma år svärmar en andra generation i juli-augusti — detta fördubblar populationstillväxten\n- **Övervintring**: Vuxna och sena larver övervintrar under bark eller i markförna\n\nEtt enda angripet träd kan producera 100 000+ barkborrar. Utan åtgärder kan populationer växa exponentiellt — 10x till 100x per år under utbrottsförhållanden.',
        keyTakeaway_en: 'Warm years enable two generations, doubling population growth. Remove infested trees before new adults emerge.',
        keyTakeaway_sv: 'Varma år möjliggör två generationer, fördubblar populationstillväxten. Ta bort angripna träd innan nya vuxna kläcks.',
      },
      {
        title_en: 'Integrated Pest Management',
        title_sv: 'Integrerad skadedjursbekämpning',
        content_en: 'Effective beetle management combines multiple approaches:\n\n**Detection:**\n- Satellite NDVI monitoring (BeetleSense)\n- Regular field inspections (especially May-August)\n- Pheromone traps for population monitoring (not as primary control)\n\n**Sanitation:**\n- Remove infested trees within 3 weeks of detection\n- Bark or chip infested material before new beetles emerge\n- Remove storm-damaged trees promptly — they are beetle magnets\n\n**Landscape strategy:**\n- Coordinate with neighboring forest owners\n- Create firebreaks of non-spruce species\n- Avoid creating large areas of edge habitat (fresh clear-cuts next to mature spruce)\n\n**Prevention:**\n- Thin regularly to maintain vigorous growth\n- Diversify species — reduce pure spruce stands\n- Maintain good forest hygiene (remove logging residue)\n- Avoid harvesting spruce during swarming season',
        content_sv: 'Effektiv barkborrehantering kombinerar flera metoder:\n\n**Detektion:**\n- Satellit-NDVI-övervakning (BeetleSense)\n- Regelbundna fältinspektioner (särskilt maj-augusti)\n- Feromonfällor för populationsövervakning (inte som primär bekämpning)\n\n**Sanering:**\n- Ta bort angripna träd inom 3 veckor efter upptäckt\n- Barka eller flisa angripet material innan nya barkborrar kläcks\n- Ta bort stormskadade träd snabbt — de attraherar barkborrar\n\n**Landskapsstrategi:**\n- Samordna med grannars skogsägare\n- Skapa brandgator av icke-granarter\n- Undvik att skapa stora kanthabitat (färska hyggen intill mogen granskog)\n\n**Förebyggande:**\n- Gallra regelbundet för att upprätthålla livskraftig tillväxt\n- Diversifiera arter — minska rena granbestånd\n- Upprätthåll god skogshygien (ta bort avverkningsrester)\n- Undvik avverkning av gran under svärmningstiden',
        keyTakeaway_en: 'Combine satellite monitoring, rapid sanitation cutting, species diversification, and neighbor coordination.',
        keyTakeaway_sv: 'Kombinera satellitövervakning, snabb sanitetsavverkning, artdiversifiering och samordning med grannar.',
        quiz: {
          question_en: 'How quickly should infested trees be removed after detection?',
          question_sv: 'Hur snabbt bör angripna träd tas bort efter upptäckt?',
          options: [
            { id: 'a', text_en: 'Within 3 weeks', text_sv: 'Inom 3 veckor' },
            { id: 'b', text_en: 'Within 6 months', text_sv: 'Inom 6 månader' },
            { id: 'c', text_en: 'Next winter', text_sv: 'Nästa vinter' },
          ],
          correctOptionId: 'a',
          explanation_en: 'Infested trees must be removed and debarked/chipped within 3 weeks — before the next generation of beetles emerges.',
          explanation_sv: 'Angripna träd måste tas bort och barkas/flisas inom 3 veckor — innan nästa generation barkborrar kläcks.',
        },
      },
    ],
  },

  // ─── 14. Continuous Cover Forestry vs Clear-Cutting ───
  {
    id: 'ccf-vs-clearcutting',
    title_en: 'Continuous Cover Forestry vs Clear-Cutting',
    title_sv: 'Hyggesfritt skogsbruk vs trakthyggesbruk',
    description_en: 'Compare the two main silvicultural approaches — their economics, ecology, and suitability for different sites.',
    description_sv: 'Jämför de två huvudsakliga skogsskötselmetoderna — deras ekonomi, ekologi och lämplighet för olika marker.',
    topic: 'operations',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    icon: 'GitBranch',
    sections: [
      {
        title_en: 'Clear-Cutting (Trakthyggesbruk)',
        title_sv: 'Trakthyggesbruk',
        content_en: 'Clear-cutting is the dominant method in Swedish forestry (~95% of harvests). The cycle:\n\n1. **Plant** → 2. **Pre-commercial thin** (röjning) → 3. **Thin 1-3 times** → 4. **Clear-cut** → 5. **Replant**\n\n**Advantages:**\n- Simple to plan and execute\n- Efficient use of heavy machinery\n- Well-understood economics\n- Higher short-term revenue\n- Easy to mechanize\n\n**Disadvantages:**\n- Landscape impact — large bare areas\n- Soil damage and erosion risk\n- Loss of biodiversity during regeneration phase\n- Storm exposure for remaining trees at edges\n- Bark beetle breeding in slash piles\n- Public perception increasingly negative',
        content_sv: 'Trakthyggesbruk är den dominerande metoden i svensk skogsbruk (~95% av avverkningarna). Cykeln:\n\n1. **Plantera** → 2. **Röjning** → 3. **Gallring 1-3 gånger** → 4. **Slutavverkning** → 5. **Återplantera**\n\n**Fördelar:**\n- Enkelt att planera och utföra\n- Effektiv användning av tunga maskiner\n- Välförstådda ekonomi\n- Högre kortsiktig avkastning\n- Lätt att mekanisera\n\n**Nackdelar:**\n- Landskapspåverkan — stora kala ytor\n- Markskador och erosionsrisk\n- Förlust av biologisk mångfald under föryngringsfasen\n- Stormexponering för kvarvarande träd vid kanter\n- Barkborreförökning i hyggesrester\n- Allmänhetens uppfattning alltmer negativ',
        keyTakeaway_en: 'Clear-cutting dominates Swedish forestry (~95%) — efficient and profitable but with ecological trade-offs.',
        keyTakeaway_sv: 'Trakthyggesbruk dominerar svenskt skogsbruk (~95%) — effektivt och lönsamt men med ekologiska avvägningar.',
      },
      {
        title_en: 'Continuous Cover Forestry (Hyggesfritt)',
        title_sv: 'Hyggesfritt skogsbruk',
        content_en: 'Continuous cover forestry (CCF) maintains permanent forest cover through selective harvesting:\n\n**Methods:**\n- **Selection cutting** (blädning): Remove individual mature trees, allowing natural regeneration in the gaps\n- **Group selection**: Harvest small groups (0.1-0.3 ha), creating micro-clearings\n- **Shelterwood** (skärmställning): Gradually remove overstory over 10-20 years\n\n**Advantages:**\n- Maintains continuous habitat and biodiversity\n- Better aesthetics and recreation value\n- More stable microclimate (less frost, less wind)\n- Continuous income flow vs. boom-bust of clear-cut cycles\n- Growing interest from environmental-conscious buyers\n\n**Disadvantages:**\n- More complex planning and execution\n- Requires skilled operators\n- Lower timber volume per harvest operation\n- Less studied in Swedish conditions\n- Can increase bark beetle risk if poorly executed (injured remaining trees)',
        content_sv: 'Hyggesfritt skogsbruk (CCF) upprätthåller permanent skogsmark genom selektiv avverkning:\n\n**Metoder:**\n- **Blädning**: Ta bort enskilda mogna träd, tillåt naturlig föryngring i luckorna\n- **Grupphugst**: Avverka små grupper (0,1-0,3 ha), skapar mikroglentor\n- **Skärmställning**: Gradvis ta bort överskiktet under 10-20 år\n\n**Fördelar:**\n- Upprätthåller kontinuerlig livsmiljö och biologisk mångfald\n- Bättre estetik och rekreationsvärde\n- Stabilare mikroklimat (mindre frost, mindre vind)\n- Kontinuerligt inkomstflöde jämfört med trakthyggesbrukets boom-bust\n- Växande intresse från miljömedvetna köpare\n\n**Nackdelar:**\n- Mer komplex planering och utförande\n- Kräver skickliga operatörer\n- Lägre virkesvolym per avverkningstillfälle\n- Mindre studerat i svenska förhållanden\n- Kan öka barkborrerisk om dåligt utfört (skadade kvarvarande träd)',
        keyTakeaway_en: 'CCF maintains continuous cover and income but requires more skill. Growing interest in Sweden.',
        keyTakeaway_sv: 'Hyggesfritt upprätthåller kontinuerligt skogstäcke och inkomst men kräver mer kunskap. Växande intresse i Sverige.',
        quiz: {
          question_en: 'What percentage of Swedish harvests currently use clear-cutting?',
          question_sv: 'Hur stor andel av svenska avverkningar använder idag trakthyggesbruk?',
          options: [
            { id: 'a', text_en: '~50%', text_sv: '~50%' },
            { id: 'b', text_en: '~75%', text_sv: '~75%' },
            { id: 'c', text_en: '~95%', text_sv: '~95%' },
          ],
          correctOptionId: 'c',
          explanation_en: 'Approximately 95% of Swedish forestry harvests use the clear-cutting (trakthyggesbruk) method, though CCF interest is growing.',
          explanation_sv: 'Ungefär 95% av svenska skogsavverkningar använder trakthyggesbruk, även om intresset för hyggesfritt växer.',
        },
      },
    ],
  },

  // ─── 15. Forest Certification — FSC and PEFC ───
  {
    id: 'forest-certification',
    title_en: 'Forest Certification — FSC and PEFC',
    title_sv: 'Skogscertifiering — FSC och PEFC',
    description_en: 'Understand the two major certification systems, their requirements, and whether certification is worth it.',
    description_sv: 'Förstå de två stora certifieringssystemen, deras krav och om certifiering är värt det.',
    topic: 'climate_sustainability',
    difficulty: 'advanced',
    estimatedMinutes: 8,
    icon: 'Award',
    sections: [
      {
        title_en: 'FSC vs PEFC Overview',
        title_sv: 'FSC vs PEFC — översikt',
        content_en: 'Two certification systems dominate globally:\n\n**FSC (Forest Stewardship Council):**\n- Founded 1993 by environmental NGOs\n- Stricter requirements, especially on biodiversity and social criteria\n- 5% of productive forest area must be set aside for conservation\n- Higher price premiums (typically 5-15%)\n- Preferred by environmentally conscious markets (UK, Netherlands, Germany)\n\n**PEFC (Programme for Endorsement of Forest Certification):**\n- Founded 1999 by forest industry\n- Based on national standards (in Sweden: Swedish Forest Certification Standard)\n- More flexible, easier for small owners\n- Lower premiums but wider acceptance in construction markets\n- ~60% of certified forests worldwide\n\nIn Sweden, many forest owners hold dual certification (both FSC and PEFC) through group schemes offered by forest owner associations.',
        content_sv: 'Två certifieringssystem dominerar globalt:\n\n**FSC (Forest Stewardship Council):**\n- Grundat 1993 av miljö-NGO:er\n- Strängare krav, särskilt på biologisk mångfald och sociala kriterier\n- 5% av produktiv skogsareal måste avsättas för naturvård\n- Högre prispremier (typiskt 5-15%)\n- Föredraget av miljömedvetna marknader (Storbritannien, Nederländerna, Tyskland)\n\n**PEFC (Programme for Endorsement of Forest Certification):**\n- Grundat 1999 av skogsindustrin\n- Baserat på nationella standarder (i Sverige: Svensk skogscertifieringsstandard)\n- Mer flexibelt, enklare för småägare\n- Lägre premier men bredare acceptans på byggmarknader\n- ~60% av certifierade skogar globalt\n\nI Sverige har många skogsägare dubbel certifiering (både FSC och PEFC) genom gruppscheman som erbjuds av skogsägarföreningar.',
        keyTakeaway_en: 'FSC is stricter with higher premiums. PEFC is more flexible. Dual certification via group schemes is common in Sweden.',
        keyTakeaway_sv: 'FSC är strängare med högre premier. PEFC är mer flexibelt. Dubbelcertifiering via gruppscheman är vanligt i Sverige.',
      },
      {
        title_en: 'Is Certification Worth It?',
        title_sv: 'Är certifiering värt det?',
        content_en: 'Cost-benefit analysis:\n\n**Costs:**\n- Annual audit fees: 1,000-5,000 SEK (through group scheme) or 15,000-50,000 SEK (individual)\n- Set-aside areas (5% for FSC) — opportunity cost of unharvested timber\n- Compliance costs: additional planning, documentation, and restrictions\n\n**Benefits:**\n- Price premiums: 5-15% on certified timber\n- Market access: some buyers only accept certified wood\n- Better forest management practices (less risk, healthier forest)\n- Pride and public credibility\n- Easier to sell to environmentally conscious consumers\n\n**Recommendation:**\n- Join a group scheme through your skogsägarförening — dramatically reduces costs\n- For most owners, the price premium alone covers certification costs\n- Many of the FSC/PEFC requirements (retention trees, buffer zones, dead wood) align with Skogsvårdslagen anyway\n- BeetleSense documentation helps with audit compliance',
        content_sv: 'Kostnads-nyttoanalys:\n\n**Kostnader:**\n- Årliga revisionsavgifter: 1 000-5 000 SEK (genom gruppschema) eller 15 000-50 000 SEK (individuell)\n- Avsatta arealer (5% för FSC) — alternativkostnad för oharverat virke\n- Efterlevnadskostnader: ytterligare planering, dokumentation och restriktioner\n\n**Fördelar:**\n- Prispremier: 5-15% på certifierat virke\n- Marknadstillgång: vissa köpare accepterar bara certifierat virke\n- Bättre skogsskötselpraxis (mindre risk, friskare skog)\n- Stolthet och offentlig trovärdighet\n- Lättare att sälja till miljömedvetna konsumenter\n\n**Rekommendation:**\n- Gå med i ett gruppschema genom din skogsägarförening — minskar kostnaderna dramatiskt\n- För de flesta ägare täcker prispremien ensam certifieringskostnaderna\n- Många FSC/PEFC-krav (evighetsträd, buffertzoner, död ved) överensstämmer med Skogsvårdslagen ändå\n- BeetleSense-dokumentation hjälper med revisionsefterlevnad',
        keyTakeaway_en: 'Join a group certification scheme — premiums usually cover costs, and many requirements overlap with existing law.',
        keyTakeaway_sv: 'Gå med i ett gruppcertifieringsschema — premierna täcker vanligtvis kostnaderna och många krav överlappar befintlig lag.',
        quiz: {
          question_en: 'What percentage of forest area must be set aside under FSC certification?',
          question_sv: 'Hur stor andel av skogsarealen måste avsättas under FSC-certifiering?',
          options: [
            { id: 'a', text_en: '1%', text_sv: '1%' },
            { id: 'b', text_en: '5%', text_sv: '5%' },
            { id: 'c', text_en: '20%', text_sv: '20%' },
          ],
          correctOptionId: 'b',
          explanation_en: 'FSC requires that 5% of productive forest area be set aside for conservation purposes.',
          explanation_sv: 'FSC kräver att 5% av produktiv skogsareal avsätts för naturvårdsändamål.',
        },
      },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────────

export function getLessonById(id: string): AcademyLesson | undefined {
  return academyLessons.find((l) => l.id === id);
}

export function getLessonsByTopic(topic: AcademyTopic): AcademyLesson[] {
  return academyLessons.filter((l) => l.topic === topic);
}

export function getLessonsByDifficulty(difficulty: DifficultyLevel): AcademyLesson[] {
  return academyLessons.filter((l) => l.difficulty === difficulty);
}

export function getNextLesson(currentId: string): AcademyLesson | undefined {
  const idx = academyLessons.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx === academyLessons.length - 1) return undefined;
  return academyLessons[idx + 1];
}

export const ALL_TOPICS: AcademyTopic[] = [
  'getting_started',
  'tree_care',
  'pest_management',
  'operations',
  'legal_tax',
  'climate_sustainability',
];

export const ALL_DIFFICULTIES: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
