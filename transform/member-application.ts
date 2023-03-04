import fetch from "node-fetch";
import os from "os";
// TODO: Use XML for less errors in parsing.
// XML looks to verbose for now. Moving on with CSV despite some member applications parsed with errors (5 errors occured).
import csv from "csvtojson";
import path from "path";
import { readJSON, writeFile } from "fs-extra";
import prettier from "prettier";
import { ListDto, MemberApplication } from "../types";

const YEAR = 2023;
const ENDPOINT = "https://www.rinkejopuslapis.lt/ataskaitos87";

const normalizeNumber = (value: string) => {
  return Number(value.replace(/\s/g, "").replace(",", "."));
};

const generate = async () => {
  const formPersonDetails = async (
    firstName: string,
    lastName: string,
    listName: string
  ): Promise<MemberApplication | null> => {
    try {
      const rawCsvResponse = await fetch(
        `${ENDPOINT}?p_p_id=electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=downloadElectionReport&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=1&type=CSV&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_reportCode=ELECTED_MUNICIPALITY_CANDIDATES_ADDITIONAL_INFO&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42reportCode=ELECTED_MUNICIPALITY_CANDIDATES_ADDITIONAL_INFO&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42ignoreType=STE&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42electionFilterTypeSAV=SAV&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42surname=${encodeURIComponent(
          lastName
        )}&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42name=${encodeURIComponent(
          firstName
        )}&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42electionId=1630&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42countyId=&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42organizationId=&select-r42cadidateSuggestedBy=&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42cadidateSuggestedBy=&_electionreportslistportlet_WAR_rpportlet_INSTANCE_qYVVN74fslyU_r42sorting=",`,
        {
          method: "get",
        }
      );

      if (!rawCsvResponse.ok) {
        console.error(
          new Error(`${rawCsvResponse.status}: ${rawCsvResponse.statusText}`)
        );
        return null;
      }

      const rawCsv = await rawCsvResponse.text();
      const csvRawLines = rawCsv.split(os.EOL).filter((value) => !!value);

      if (csvRawLines.length < 2) {
        console.info(
          `Not enough lines after filtering out empty ones! Skipped the "${firstName} ${lastName}".`
        );
        return null;
      }

      const [_heading, ...applicationRawLines] = csvRawLines;
      const applicationLines = await Promise.all(
        applicationRawLines.map(async (rawLine) =>
          csv({
            noheader: true,
            output: "csv",
          }).fromString(rawLine)
        )
      );
      const applicationsForTheList = applicationLines.filter((entry) => {
        return entry[0][8].toLocaleUpperCase() === listName.toLocaleUpperCase();
      });

      if (!applicationsForTheList.length) {
        console.error(
          `No appliction found for the "${firstName} ${lastName}" in the "${listName}" list!!! Manual attention required.`
        );
        return null;
      }

      if (applicationsForTheList.length > 1) {
        console.error(
          `Multiple members with the same name "${firstName} ${lastName}" detected!!! Manual attention required.`
        );
        return null;
      }

      const dataPieces = applicationsForTheList[0][0];

      return {
        // Gimimo data
        birthday: dataPieces[3],
        // Einamos pareigos (tarnyba)
        occupation: dataPieces[14],
        // Narystė partijoje, asociacijose
        partyMembership: dataPieces[15],
        // Ar neturite nebaigtos atlikti teismo nuosprendžiu paskirtos bausmės?
        isPenaltyPending: !!dataPieces[16],
        // Ar esate kitos valstybės pilietis? Kokios?
        differentCitizenship: dataPieces[20]
          ? `${dataPieces[20]}, ${dataPieces[21] || "-"}`
          : "",
        wasConvictedGuilty: dataPieces[23],
        wasConvictedGuiltyDetails: dataPieces[24],
        incomeSumEur: normalizeNumber(dataPieces[28]),
        taxesSumEur: normalizeNumber(dataPieces[33]),
        propertySumEur: normalizeNumber(dataPieces[34]),
        valuesSumEur: normalizeNumber(dataPieces[35]),
        moneySumEur: normalizeNumber(dataPieces[36]),
        loansProvidedEur: normalizeNumber(dataPieces[37]),
        loansReceivedEur: normalizeNumber(dataPieces[38]),
      };
    } catch (error) {
      console.error(
        `Failed to get application for "${firstName} ${lastName}".`
      );
      console.error(error);
      return null;
    }
  };

  const listsData: ListDto = await readJSON(
    path.resolve(__dirname, `../transformed-data/${YEAR}.json`)
  );

  const applicationsMap: Record<string, MemberApplication | null> = {};

  // Cannot run in requests in parallel as the API has its limit.
  for (const { name, members } of listsData.lists) {
    for (const member of members) {
      const names = member.name.split(" ");
      const firstNames = names.slice(0, names.length - 1);
      const lastName = names[names.length - 1];
      const application = await formPersonDetails(
        firstNames.join(" "),
        lastName,
        name
      );

      applicationsMap[`${name}-${member.name}-${member.position}`] =
        application;
    }
  }

  await writeFile(
    path.join(
      __dirname,
      `../transformed-data/members-applications-${YEAR}.json`
    ),
    prettier.format(JSON.stringify(applicationsMap), { parser: "json" })
  );
};

generate();

// TODO: Add check if the member was in the council.
// https://www.rinkejopuslapis.lt/ataskaitu-formavimas?p_p_id=allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=downloadElectionReport&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1&type=CSV&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_reportCode=PARISH_COUNCIL&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34reportCode=PARISH_COUNCIL&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34electionFilterTypeSAV=SAV&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34ignoreType=STE&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34electionTermId=41&r34municipalityId=498&r34termDate=2023-02-21&r34surname=Matijo%C5%A1aitis&select-r34position=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34position=&select-r34active=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34active=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34electionId=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34organizationId=&select-r34cadidateSuggestedBy=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34cadidateSuggestedBy=&_allelectionreportslistportlet_WAR_rpportlet_INSTANCE_GdxhH7xgZxqG_r34sorting=
// TODO: Calculate monthly payment equivalent?
// TODO: Can we see if enough taxes paid?
// More data from VRK.
// TODO: With what legal entities has relations?
    // Bussiness domain, taxes, website of the legal entity. Could we get it from Rekvizitai?
// TODO: Work experience
// TODO: Education
// TODO: Birth place.