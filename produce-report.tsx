import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFile, readJson } from "fs-extra";
import { format } from "prettier";
import isValid from "date-fns/isValid";
import differenceInYears from "date-fns/differenceInYears";
import { decode } from "html-entities";
import {
  List,
  ListDto,
  ListMember,
  MemberApplication,
  MemberApplications,
} from "./types";

const TRANSFORMED_DATA_PATH = path.join(__dirname, "transformed-data");
const YEARS = [2011, 2015, 2019, 2023];

const currencyFormatter = new Intl.NumberFormat("lt", {
  currency: "eur",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Source: https://www.tagidas.lt/savadai/9003/
const MINIMAL_MONTHLY_WAGE_BRUTO: Record<number, number> = {
  2021: 642,
  2022: 730,
  2023: 840,
};

// https://www.tagidas.lt/savadai/9029/
const AVERATE_MONTHLY_WAGE_BRUTO: Record<number, number> = {
  2021: 1352.7,
  2022: 1504.1,
  2023: 1684.9,
};

// We have data two years before the election.
const taxDeclarationYear = YEARS[YEARS.length - 1] - 2;

const minimalMonthlyWageBrutoPerLastYear =
  MINIMAL_MONTHLY_WAGE_BRUTO[taxDeclarationYear] * 12;
const averageMonthlyWageBrutoPerLastYear =
  AVERATE_MONTHLY_WAGE_BRUTO[taxDeclarationYear] * 12;

const generate = async () => {
  const dataSets: {
    year: number;
    data: ListDto;
  }[] = (
    await Promise.all(
      YEARS.map(async (year) => {
        const data = await readJson(
          path.join(TRANSFORMED_DATA_PATH, `${year}.json`)
        );

        return {
          year,
          data,
        };
      })
    )
  )
    //   Sort descending.
    .sort((setA, setB) => {
      return setB.year - setA.year;
    });

  const memberApplicationsOfLatestYear: MemberApplications = await readJson(
    path.join(
      TRANSFORMED_DATA_PATH,
      `members-applications-${YEARS[YEARS.length - 1]}.json`
    )
  );

  const [latestDataSet, ...restDataSets] = dataSets;

  const availableSeats = 41;
  const reportResult = renderToStaticMarkup(
    <html>
      <head>
        <title>
          Kauno miesto savivaldybės tarybos kanidatų sąrašų palyginimas
        </title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* https://css-tricks.com/responsive-data-tables/ */
          /* 
          Generic Styling, for Desktops/Laptops 
          */
          table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          /* Zebra striping */
          tr:nth-of-type(odd) { 
            background: #eee; 
          }
          th { 
            background: #333; 
            color: white; 
            font-weight: bold; 
          }
          td, th { 
            padding: 6px; 
            border: 1px solid #ccc; 
            text-align: left; 
          }`,
          }}
        />
      </head>
      <body>
        <h1>Kauno miesto savivaldybės tarybos kanidatų sąrašų palyginimas</h1>
        <ul>
          <li>
            <strong>Tarybos vietų skaičius:</strong>
            <span>
              {availableSeats}&nbsp;
              <a
                href="https://lt.wikipedia.org/wiki/Kauno_miesto_savivaldyb%C4%97s_taryba"
                target="_blank"
              >
                (Wikipedia)
              </a>
            </span>
          </li>
        </ul>
        {latestDataSet.data.lists.map(({ name, members }) => {
          const listSummary = members.reduce(
            (result, member) => {
              const memberApplication: MemberApplication | undefined =
                memberApplicationsOfLatestYear[
                  [name, member.name, member.position].join("-")
                ];

              if (!memberApplication) {
                return result;
              }

              const birthDate = memberApplication?.birthday
                ? new Date(memberApplication.birthday)
                : undefined;
              const age =
                birthDate && isValid(birthDate)
                  ? differenceInYears(new Date(), birthDate)
                  : undefined;
              result.ageSum += age || 0;
              result.incomeSumEur += memberApplication.incomeSumEur;
              result.taxesSumEur += memberApplication.taxesSumEur;
              result.propertySumEur += memberApplication.propertySumEur;
              result.valuesSumEur += memberApplication.valuesSumEur;
              result.loansReceivedSumEur += memberApplication.loansReceivedEur;
              result.loansProvidedSumEur += memberApplication.loansProvidedEur;
              result.countOfMembersWithData++;

              if (!!memberApplication.differentCitizenship.trim()) {
                result.countWithDifferentCitizenship++;
              }

              if (memberApplication.isPenaltyPending) {
                result.countWithPendingPenalty++;
              }

              if (!!memberApplication.wasConvictedGuilty.trim()) {
                result.countOfConvictedGuilty++;
              }

              if (memberApplication.incomeSumEur === 0) {
                result.countWithNoIncomes++;
              }

              if (memberApplication.moneySumEur === 0) {
                result.countWithNoMoney++;
              }

              if (memberApplication.propertySumEur === 0) {
                result.countWithNoProperty++;
              }

              if (
                memberApplication.incomeSumEur +
                  memberApplication.propertySumEur +
                  memberApplication.valuesSumEur +
                  memberApplication.moneySumEur >
                1000000
              ) {
                result.countOfMilionaires++;
              }

              if (
                memberApplication.incomeSumEur <
                minimalMonthlyWageBrutoPerLastYear
              ) {
                result.countWithIncomesLowerThanMinimalWagePerYear++;
              }

              if (
                memberApplication.incomeSumEur <
                averageMonthlyWageBrutoPerLastYear
              ) {
                result.countWithIncomesLowerThanAverageWagePerYear++;
              }

              return result;
            },
            {
              ageSum: 0,
              countWithDifferentCitizenship: 0,
              countWithPendingPenalty: 0,
              countOfConvictedGuilty: 0,
              incomeSumEur: 0,
              taxesSumEur: 0,
              valuesSumEur: 0,
              propertySumEur: 0,
              loansReceivedSumEur: 0,
              loansProvidedSumEur: 0,
              countWithNoIncomes: 0,
              countWithNoMoney: 0,
              countWithIncomesLowerThanMinimalWagePerYear: 0,
              countWithIncomesLowerThanAverageWagePerYear: 0,
              countWithNoProperty: 0,
              countOfMilionaires: 0,
              countOfMembersWithData: 0,
            }
          );

          return (
            <details key={name}>
              <summary>
                {name} ({members.length} narys/nariai)
              </summary>
              <div>
                <ul>
                  <li>
                    <strong>Ar pasiruošę užpildyti visą tarybą?</strong>
                    <span>
                      {" "}
                      {members.length >= availableSeats ? (
                        <span style={{ color: "green" }}>Taip</span>
                      ) : (
                        <span style={{ color: "red" }}>Ne</span>
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>Amžiaus vidurkis</strong>
                    <span>
                      {" "}
                      {(
                        listSummary.ageSum / listSummary.countOfMembersWithData
                      ).toFixed(2)}
                    </span>
                  </li>
                  <li>
                    <strong>Turinčių kitą pilietybę skaičius</strong>
                    <span> {listSummary.countWithDifferentCitizenship}</span>
                  </li>
                  <li>
                    <strong>Skaičius su galiojančiu baustumu</strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithPendingPenalty > 0
                            ? "red"
                            : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithPendingPenalty}
                    </span>
                  </li>
                  <li>
                    <strong>Baustų skaičius</strong>
                    <span
                      style={{
                        color:
                          listSummary.countOfConvictedGuilty > 0
                            ? "red"
                            : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countOfConvictedGuilty}
                    </span>
                  </li>
                  <li>
                    <strong>Pajamų vidurkis</strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.incomeSumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>
                      Skaičius turinčių mažesnes nei minimali alga per metus
                      pajamas
                    </strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithIncomesLowerThanMinimalWagePerYear >
                          0
                            ? "red"
                            : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithIncomesLowerThanMinimalWagePerYear}
                    </span>
                  </li>
                  <li>
                    <strong>
                      Skaičius turinčių mažesnes nei vidutinė alga per metus
                      pajamas
                    </strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithIncomesLowerThanAverageWagePerYear >
                          0
                            ? "red"
                            : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithIncomesLowerThanAverageWagePerYear}
                    </span>
                  </li>
                  <li>
                    <strong>Sumokėtų mokesčių vidurkis</strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.taxesSumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>
                      Vertybinių popierių, meno kūrinių, juvelyrinių dirbinių
                      vidurkis
                    </strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.valuesSumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>Turto vidurkis</strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.propertySumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>Gautų paskolų vidurkis</strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.loansReceivedSumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>Suteiktų paskolų vidurkis</strong>
                    <span>
                      {" "}
                      {currencyFormatter.format(
                        listSummary.loansProvidedSumEur /
                          listSummary.countOfMembersWithData
                      )}
                    </span>
                  </li>
                  <li>
                    <strong>Neturinčių pajamų skaičius</strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithNoIncomes > 0 ? "red" : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithNoIncomes}
                    </span>
                  </li>
                  <li>
                    <strong>Neturinčių piniginių lėšų skaičius</strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithNoMoney > 0 ? "red" : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithNoMoney}
                    </span>
                  </li>
                  <li>
                    <strong>Neturinčių turto skaičius</strong>
                    <span
                      style={{
                        color:
                          listSummary.countWithNoProperty > 0 ? "red" : "green",
                      }}
                    >
                      {" "}
                      {listSummary.countWithNoProperty}
                    </span>
                  </li>
                  <li>
                    <strong>
                      Milijonierių skaičius (pajamos + turtas + vertybiniai
                      popieriai, meno kūriniai, juvelyriniai dirbiniai +
                      piniginės lėšos, neskaičiuojant paskolų)
                    </strong>
                    <span> {listSummary.countOfMilionaires}</span>
                  </li>
                </ul>
                <table>
                  <thead>
                    <tr>
                      <th>Vardas</th>
                      <th>Pavardė</th>
                      <th>Pozicija</th>
                      <th>
                        Patirtis (kandidatavo su sąrašu, pokytis nuo esamos
                        pozicijos)
                      </th>
                      <th>Gimimo data (amžius)</th>
                      <th>Esamos pareigos</th>
                      <th>Priklauso partijai/organizacijai</th>
                      <th>Kita pilietybė</th>
                      <th>Kriminalinė situacija</th>
                      <th>Finansinė situacija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => {
                      const names = member.name.split(" ");
                      const firstNames = names.slice(0, names.length - 1);
                      const lastName = names[names.length - 1];
                      const memberApplication: MemberApplication | undefined =
                        memberApplicationsOfLatestYear[
                          [name, member.name, member.position].join("-")
                        ];
                      const birthDate = memberApplication?.birthday
                        ? new Date(memberApplication.birthday)
                        : undefined;
                      const age =
                        birthDate && isValid(birthDate)
                          ? differenceInYears(new Date(), birthDate)
                          : undefined;

                      return (
                        <tr key={`${member.name}-${index}`}>
                          <td>{firstNames.join(" ")}</td>
                          <td>{lastName}</td>
                          <td>{member.position}</td>
                          <td>
                            <table>
                              <thead>
                                <tr>
                                  {restDataSets.map(({ year }) => (
                                    <th key={year}>{year}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {restDataSets.map(({ year, data }) => {
                                    const experienceAtTheTime =
                                      data.lists.reduce<
                                        | {
                                            member: ListMember;
                                            list: List;
                                          }
                                        | undefined
                                      >((result, listItem) => {
                                        const foundMember =
                                          listItem.members.find(
                                            (memberItem) => {
                                              return (
                                                memberItem.name === member.name
                                              );
                                            }
                                          );

                                        if (foundMember) {
                                          return {
                                            member: foundMember,
                                            list: listItem,
                                          };
                                        }
                                        return result;
                                      }, undefined);
                                    return (
                                      <th key={year}>
                                        {experienceAtTheTime
                                          ? `${
                                              experienceAtTheTime.list.name
                                            } (${
                                              experienceAtTheTime.member
                                                .position -
                                                member.position >
                                              0
                                                ? "+"
                                                : experienceAtTheTime.member
                                                    .position -
                                                    member.position ===
                                                  0
                                                ? ""
                                                : "-"
                                            }${Math.abs(
                                              experienceAtTheTime.member
                                                .position - member.position
                                            )})`
                                          : "-"}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td>
                            {memberApplication?.birthday || "-"} ({age || "-"})
                          </td>
                          <td>{memberApplication?.occupation || ""}</td>
                          <td>
                            {memberApplication
                              ? decode(memberApplication.partyMembership)
                              : ""}
                          </td>
                          <td>
                            {memberApplication?.differentCitizenship || ""}
                          </td>
                          <td>
                            <table>
                              <thead>
                                <tr>
                                  <th>
                                    Yra galiojanti bausmė{" "}
                                    <span title="Anketos punktas: Ar neturite nebaigtos atlikti teismo nuosprendžiu paskirtos bausmės?">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Buvo/yra teismo baustas{" "}
                                    <span title="Anketos punktas: Ar po 1990-03-11 buvote pripažintas kaltu dėl nusikalstamos veikos arba bet kada buvote pripažintas kaltu dėl sunkaus ar labai sunkaus nusikaltimo padarymo, nepaisant to, ar teistumas išnykęs ar panaikintas (Įstatymo 36 straipsnio 12 dalis)?">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Baustumo detalės{" "}
                                    <span title="Anketos punktas: Nuosprendis (sprendimas)">
                                      (i)
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>
                                    {memberApplication
                                      ? memberApplication.isPenaltyPending
                                        ? "Taip"
                                        : "Ne"
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? memberApplication.wasConvictedGuilty
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? memberApplication.wasConvictedGuiltyDetails
                                      : "-"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td>
                            <table>
                              <thead>
                                <tr>
                                  <th>
                                    Gavo pajamų už EUR{" "}
                                    <span title="Anketos punktas: PD pajamų suma (eurais); PD - pajamų deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Pajamos mažesnės už minimalų mėnesinį darbo
                                    užmokestį per metus
                                  </th>
                                  <th>
                                    Pajamos mažesnės už vidutinį mėnesinį darbo
                                    užmokestį per metus
                                  </th>
                                  <th>
                                    Sumokėjo mokesčių EUR{" "}
                                    <span title="Anketos punktas: PD mokesčių suma (eurais); PD - pajamų deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Turi turto už EUR{" "}
                                    <span title="Anketos punktas: TD turto suma (eurais); TD - turto deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Turi vertybinių popierių, meno kūrinių,
                                    juvelyrinių dirbinių už EUR{" "}
                                    <span title="Anketos punktas: TD vertybių suma (eurais); TD - turto deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Turi piniginių lėšų už EUR{" "}
                                    <span title="Anketos punktas: TD piniginės lėšos (eurais); TD - turto deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Suteikė paskolų už EUR{" "}
                                    <span title="Anketos punktas: TD suteiktos paskolos (eurais); TD - turto deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Skolinosi už EUR{" "}
                                    <span title="Anketos punktas: TD gautos paskolos (eurais); TD - turto deklaracija">
                                      (i)
                                    </span>
                                  </th>
                                  <th>
                                    Yra milionierius/milijonierė (suma EUR){" "}
                                    <span
                                      title="pajamos + turtas + vertybiniai
                      popieriai, meno kūriniai, juvelyriniai dirbiniai +
                      piniginės lėšos, neskaičiuojant paskolų"
                                    >
                                      (i)
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        memberApplication.incomeSumEur === 0
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.incomeSumEur
                                        )
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        memberApplication.incomeSumEur <
                                          minimalMonthlyWageBrutoPerLastYear
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? memberApplication.incomeSumEur <
                                        minimalMonthlyWageBrutoPerLastYear
                                        ? "Taip"
                                        : "Ne"
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        memberApplication.incomeSumEur <
                                          averageMonthlyWageBrutoPerLastYear
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? memberApplication.incomeSumEur <
                                        averageMonthlyWageBrutoPerLastYear
                                        ? "Taip"
                                        : "Ne"
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        memberApplication.taxesSumEur === 0
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.taxesSumEur
                                        )
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        memberApplication.propertySumEur === 0
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.propertySumEur
                                        )
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.valuesSumEur
                                        )
                                      : "-"}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        memberApplication &&
                                        // Had less money than minimal wage per month at that year.
                                        memberApplication.moneySumEur <
                                          MINIMAL_MONTHLY_WAGE_BRUTO[
                                            taxDeclarationYear
                                          ]
                                          ? "red"
                                          : undefined,
                                    }}
                                  >
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.moneySumEur
                                        )
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.loansProvidedEur
                                        )
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? currencyFormatter.format(
                                          memberApplication.loansReceivedEur
                                        )
                                      : "-"}
                                  </td>
                                  <td>
                                    {memberApplication
                                      ? `${
                                          memberApplication.incomeSumEur +
                                            memberApplication.propertySumEur +
                                            memberApplication.valuesSumEur +
                                            memberApplication.moneySumEur >
                                          1000000
                                            ? "Taip"
                                            : "Ne"
                                        } (${currencyFormatter.format(
                                          memberApplication.incomeSumEur +
                                            memberApplication.propertySumEur +
                                            memberApplication.valuesSumEur +
                                            memberApplication.moneySumEur
                                        )})`
                                      : "-"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </body>
    </html>
  );
  await writeFile(
    path.join(__dirname, "report.html"),
    format(reportResult, { parser: "html" })
  );
};

generate();
