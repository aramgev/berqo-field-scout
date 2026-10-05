import { FieldObservation, LocalText } from './domain';

export type CareStep = { title: LocalText; detail: LocalText };
const step = (en: string, hy: string, detailEn: string, detailHy: string): CareStep => ({ title: { en, hy }, detail: { en: detailEn, hy: detailHy } });
const compare = step('Check nearby trees', 'Զննեք մոտակա ծառերը', 'Look for similar changes on nearby leaves and fruit. Note which trees are affected.', 'Մոտակա տերևների ու պտուղների վրա փնտրեք նման փոփոխություններ։ Նշեք՝ որ ծառերն են ախտահարված։');
const confirm = step('Confirm before treatment', 'Հաստատեք բուժումից առաջ', 'Share photos and notes with an agronomist to confirm the cause and choose care.', 'Լուսանկարներն ու նշումները փոխանցեք գյուղատնտեսին՝ պատճառը հաստատելու և խնամք ընտրելու համար։');

// Curated field actions, never generated from a model score. Treatment selection
// stays with a local expert. Sources checked on 5 October 2026.
export function carePlan(item: FieldObservation): { steps: CareStep[]; sourceUrl?: string } {
  if (item.decision === 'unavailable') return { steps: [
    step('Keep the evidence', 'Պահպանեք լուսանկարը', 'Save this photo and add the tree location or a note for your agronomist.', 'Պահպանեք լուսանկարը և ավելացրեք ծառի տեղանքը կամ նշում մասնագետի համար։'),
    step('Enable offline checks', 'Միացրեք անցանց ստուգումը', 'Install the apricot model in Settings, then check a new photo.', 'Կարգավորումներում տեղադրեք ծիրանի մոդելը, ապա ստուգեք նոր լուսանկար։'),
  ] };
  if (item.decision !== 'possible') return { steps: [
    step('Take a clearer photo', 'Լուսանկարեք ավելի հստակ', 'Use daylight and fill the frame with one apricot leaf or fruit. Avoid blur and deep shadows.', 'Լուսանկարեք ցերեկային լույսով՝ կադրում մեկ ծիրանի տերև կամ պտուղ։ Խուսափեք մշուշից և ուժեղ ստվերից։'),
    step('If the problem persists', 'Եթե խնդիրը պահպանվում է', 'Save the photos and share them with an agronomist, even if a new photo is inconclusive.', 'Պահպանեք լուսանկարները և կիսվեք գյուղատնտեսի հետ, նույնիսկ եթե նոր արդյունքը ևս անորոշ է։'),
  ] };
  switch (item.advisoryId) {
    case 'healthy': return { steps: [compare, step('Keep a reference photo', 'Պահպանեք համեմատության համար', 'Save this check to compare visible changes on your next visit.', 'Պահպանեք այս ստուգումը՝ հաջորդ այցի փոփոխությունները համեմատելու համար։')] };
    case 'shot_hole_leaves':
    case 'shot_hole_fruit': return { steps: [
      compare,
      step('Keep irrigation off foliage', 'Ոռոգելիս մի թրջեք սաղարթը', 'Check sprinkler direction. Keep irrigation water off leaves and fruit where practical.', 'Ստուգեք ջրցանների ուղղությունը։ Հնարավորության դեպքում մի թրջեք տերևներն ու պտուղները։'),
      confirm,
    ], sourceUrl: 'https://ipm.ucanr.edu/home-and-landscape/shot-hole-or-coryneum-blight/' };
    case 'brown_rot': return { steps: [
      step('Look for dried fruit', 'Փնտրեք չորացած պտուղներ', 'Check for shriveled fruit on the tree and ground, and affected blossoms or twigs.', 'Ծառի վրա և գետնին փնտրեք չորացած պտուղներ, նաև վնասված ծաղիկներ կամ ճյուղեր։'),
      step('Plan orchard cleanup', 'Պլանավորեք այգու մաքրումը', 'Remove dried fruit mummies from trees after harvest or during dormancy; confirm timing locally.', 'Ծառերից չորացած պտուղները հեռացրեք բերքահավաքից հետո կամ հանգստի շրջանում։ Ժամկետը ճշտեք մասնագետի հետ։'),
      confirm,
    ], sourceUrl: 'https://ipm.ucanr.edu/agriculture/apricot/brown-rot-blossom-and-twig-blight/' };
    default: return { steps: [compare, confirm] };
  }
}
