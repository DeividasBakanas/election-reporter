export interface List {
  name: string;
  number?: number;
  members: ListMember[];
}

export interface ListMember {
  name: string;
  position: number;
}

export interface ListDto {
  lists: List[];
  listNames: string[];
}

export interface MemberApplication {
  // Gimimo data
  birthday: string;
  // Einamos pareigos (tarnyba)
  occupation: string;
  // Narystė partijoje, asociacijose
  partyMembership: string;
  // Ar neturite nebaigtos atlikti teismo nuosprendžiu paskirtos bausmės?
  isPenaltyPending: boolean;
  // Ar esate kitos valstybės pilietis? Kokios?
  differentCitizenship: string;
  // Ar po 1990-03-11 buvote pripažintas kaltu dėl nusikalstamos veikos arba bet kada buvote pripažintas kaltu dėl sunkaus ar labai sunkaus nusikaltimo padarymo, nepaisant to, ar teistumas išnykęs ar panaikintas (Įstatymo 36 straipsnio 12 dalis)?
  wasConvictedGuilty: string;
  // Nuosprendis (sprendimas)
  wasConvictedGuiltyDetails: string;
  // PD pajamų suma (eurais)
  incomeSumEur: number;
  // PD mokesčių suma (eurais)
  taxesSumEur: number;
  // TD turto suma (eurais)
  propertySumEur: number;
  // TD vertybių suma (eurais)
  valuesSumEur: number;
  // TD piniginės lėšos (eurais)
  moneySumEur: number;
  // TD suteiktos paskolos (eurais)
  loansProvidedEur: number;
  // TD gautos paskolos (eurais)
  loansReceivedEur: number;
}

/**
 * The key is a combination of list name, member name and member number joined with a `-`.
 */
export type MemberApplications = Record<string, MemberApplication>;
