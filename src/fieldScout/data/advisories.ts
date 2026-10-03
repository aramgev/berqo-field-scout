import { Advisory } from '../domain';
const sourceUrl = 'https://ipm.ucanr.edu/PMG/C005/m005fpdiseases.html';
const inspect = { en: 'Photograph several nearby leaves and fruit. Note how many trees are affected. Ask an agronomist to confirm the cause before treatment.', hy: 'Լուսանկարեք մոտակա մի քանի տերև և պտուղ։ Նշեք՝ քանի ծառ է ախտահարված։ Բուժումից առաջ դիմեք գյուղատնտեսի՝ պատճառը հաստատելու համար։' };
export const advisories: Record<string, Advisory> = {
  healthy: { id: 'healthy', title: { en: 'No obvious symptoms in this photo', hy: 'Այս լուսանկարում ակնհայտ ախտանիշներ չկան' }, summary: { en: 'This photo cannot rule out disease. Continue inspecting nearby trees, leaves and fruit, especially if you see changes.', hy: 'Այս լուսանկարը չի բացառում հիվանդությունը։ Շարունակեք զննել մոտակա ծառերը, տերևներն ու պտուղները, հատկապես փոփոխությունների դեպքում։' } },
  shot_hole_leaves: { id: 'shot_hole_leaves', title: { en: 'Possible shot hole • leaf', hy: 'Հնարավոր ծակոտկենություն • տերև' }, summary: inspect, sourceUrl },
  shot_hole_fruit: { id: 'shot_hole_fruit', title: { en: 'Possible shot hole • fruit', hy: 'Հնարավոր ծակոտկենություն • պտուղ' }, summary: inspect, sourceUrl },
  brown_rot: { id: 'brown_rot', title: { en: 'Possible brown rot', hy: 'Հնարավոր գորշ փտում' }, summary: inspect, sourceUrl },
  powdery_mildew: { id: 'powdery_mildew', title: { en: 'Possible powdery mildew', hy: 'Հնարավոր ալրացող' }, summary: inspect },
  dieback: { id: 'dieback', title: { en: 'Possible branch dieback', hy: 'Հնարավոր ճյուղերի չորացում' }, summary: inspect, sourceUrl },
  gumosis_and_galls: { id: 'gumosis_and_galls', title: { en: 'Possible gum or gall symptoms', hy: 'Հնարավոր խեժահոսք կամ գոյացություններ' }, summary: inspect, sourceUrl },
  other_disorder_e_g_water_stress: { id: 'other_disorder_e_g_water_stress', title: { en: 'Possible stress symptoms', hy: 'Հնարավոր սթրեսի ախտանիշներ' }, summary: inspect },
  wilting: { id: 'wilting', title: { en: 'Possible wilting', hy: 'Հնարավոր թառամում' }, summary: inspect },
  uncertain: { id: 'uncertain', title: { en: 'A closer look is needed', hy: 'Անհրաժեշտ է ավելի մանրամասն զննում' }, summary: { en: 'AI is not confident enough to identify this safely. Try a clear, close photo in daylight, with one affected leaf or fruit filling the frame. If symptoms persist, request expert review.', hy: 'Արհեստական բանականությունը բավարար վստահ չէ։ Փորձեք ցերեկային լույսով հստակ, մոտիկ լուսանկար՝ մեկ ախտահարված տերևով կամ պտղով։ Եթե ախտանիշները պահպանվում են, դիմեք մասնագետի։' } },
  unavailable: { id: 'unavailable', title: { en: 'Photo recorded • AI unavailable', hy: 'Լուսանկարն արձանագրված է • ԱԲ-ն անհասանելի է' }, summary: { en: 'Save the photo for expert review. Install the apricot model in Settings to enable offline AI. No prediction has been made.', hy: 'Պահպանեք լուսանկարը մասնագետի համար։ Կարգավորումներում տեղադրեք ծիրանի մոդելը՝ անցանց ԱԲ-ն միացնելու համար։ Կանխատեսում չի կատարվել։' } },
};
export function getAdvisory(id: string): Advisory { return advisories[id] ?? advisories.uncertain; }
