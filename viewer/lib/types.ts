// Mirrors the response from /meicepro-api/open/diagnosis/get/{id}/{lang}.
// Field set captured from a real MC900 v1.3.0.6 report.

export interface DiagnosisSkinDetail {
  symptom: string; // 2-digit zero-padded code
  degreeLevel: number; // 1=mild, 2=moderate, 3=severe; wrinkles can extend up to 6
  counts: number;
  area: number;
  areaRatio: number;
}

export interface DiagnosisSkin {
  id: string;
  diagnosisId: string;
  cusId: string;
  shopId: string;
  userId: string;
  oemId: string;
  direction: -1 | 0 | 1;
  diagnosisStatus: number;
  isFinished: number;

  selectedType: unknown;
  skinAge: number;
  skinColor: string;
  skinScore: number;
  skinType: number | null;
  agingIndex: number;

  // Symptom buckets — every block follows the same {Score, Num, Area, Ratio} pattern.
  acneArea: number;
  acneNum: number;
  acneRatio: number;
  acneScore: number;

  brownspotAgingIndex: number;
  brownspotArea: number | null;
  brownspotNum: number;
  brownspotRatio: number;
  brownspotScore: number;
  brownspotWeight: number | null;

  poreArea: number | null;
  poreNum: number | null;
  poreRatio: number;
  poreScore: number;

  redAcneArea: number;
  redAcneNum: number;
  redAcneRatio: number;
  redAcneScore: number;

  redspotArea: number;
  redspotNum: number;
  redspotRatio: number;
  redspotScore: number;

  surfacespotArea: number;
  surfacespotNum: number;
  surfacespotRatio: number;
  surfacespotScore: number;

  textureArea: number;
  textureNum: number;
  textureRatio: number;
  textureScore: number;

  uvdeepspotArea: number;
  uvdeepspotNum: number;
  uvdeepspotRatio: number;
  uvdeepspotScore: number;

  uvspotArea: number;
  uvspotNum: number;
  uvspotRatio: number;
  uvspotScore: number;

  wrinkleScore: number;
  wrinkleBetweeneyeAgingIndex: number | null;
  wrinkleBetweeneyeScore: number;
  wrinkleBetweeneyeWeight: number | null;
  wrinkleCormouthAgingIndex: number | null;
  wrinkleCormouthScore: number;
  wrinkleCormouthWeight: number | null;
  wrinkleForeheadAgingIndex: number | null;
  wrinkleForeheadScore: number;
  wrinkleForeheadWeight: number | null;
  wrinkleGlabellarAgingIndex: number | null;
  wrinkleGlabellarScore: number;
  wrinkleGlabellarWeight: number | null;
  wrinkleNasofoldsAgingIndex: number | null;
  wrinkleNasofoldsScore: number;
  wrinkleNasofoldsWeight: number | null;
  wrinkleSideAgingIndex: number | null;
  wrinkleSideScore: number;
  wrinkleSideWeight: number | null;
  wrinkleUndereyeAgingIndex: number | null;
  wrinkleUndereyeScore: number;
  wrinkleUndereyeWeight: number | null;

  diagnosisSkinDetailList: DiagnosisSkinDetail[];

  // Image asset URLs — many can be null depending on direction.
  imgAcnePng: string | null;
  imgAging: string | null;
  imgBetweeneyePng: string | null;
  imgBloodmap: string | null;
  imgBrownHotmap: string | null;
  imgBrownSpotPng: string | null;
  imgBrownmap: string | null;
  imgCoolMap: string | null;
  imgCormouthPng: string | null;
  imgCross: string | null;
  imgDaylight: string | null;
  imgDeepBrownMap: string | null;
  imgDeepGraySpotPng: string | null;
  imgDeepRedMap: string | null;
  imgDeepSpotPng: string | null;
  imgForeheadPng: string | null;
  imgGlabellarPng: string | null;
  imgNasofoldsPng: string | null;
  imgParallel: string | null;
  imgPorePng: string | null;
  imgRedAcnePng: string | null;
  imgRedhotmap: string | null;
  imgRedmap: string | null;
  imgRetouch: string | null;
  imgSensitiveAreaPng: string | null;
  imgSidePng: string | null;
  imgSurfaceSpotAging: string | null;
  imgSurfaceSpotPng: string | null;
  imgTexturePng: string | null;
  imgUndereyePng: string | null;
  imgUv: string | null;
  imgUvHighContrast: string | null;
  imgUvSpecial: string | null;
  imgWood: string | null;
  imgWrinklePng: string | null;
  jsonAging: string | null;
}

export interface Customer {
  id: string;
  cusName: string;
  birthday: string | null;
  gender: number | null;
  phone: string | null;
  email: string | null;
  diagnosisCc: string | null;
  cusDesc: string | null;
  shopId: string;
  shopName: string;
  skinType: number | null;
  itaStandard: number | null;
  beauty: number | null;
  married: number | null;
  procreated: number | null;
  createTime: string;
  optTime: string;
}

export interface Diagnosis {
  id: string;
  cusId: string;
  shopId: string;
  oemId: string;
  algType: number;
  algVersion: string;
  appVersion: string;
  dataVersion: number;
  deviceNo: string;
  directions: string;
  diagnosisStatus: number;
  skinAge: number;
  skinScore: number;
  meiceExtra: string | null;
  createTime: string;
  uploadTime: string;
  diagnosisSkinList: DiagnosisSkin[];
  customerQueryResponse: Customer | null;
  proposal: string | null;
}

export interface SymptomDesc {
  id: string;
  symptom: string;
  language: string;
  description: string;
  reason: string;
  advise: string;
  img: string | null;
  oemId: string | null;
  shopId: string | null;
  scoreMin: number | null;
  scoreMax: number | null;
}

export interface ReportPayload {
  code: number;
  status: string;
  message: string;
  datas: {
    customer: Customer;
    diagnosis: Diagnosis;
    diagnosisProductList: unknown[];
    priceEnable: number;
    symptomDescList: SymptomDesc[];
  };
}

export type DirectionLabel = "left" | "center" | "right";

export const DIRECTION_LABEL: Record<-1 | 0 | 1, DirectionLabel> = {
  [-1]: "left",
  0: "center",
  1: "right",
};
