# Compare the list

A deployed version can be found [here](https://bakanas.lt/rinkimai/2023/kauno-savivaldybes-tarybos-rinkimai.html).

## Steps

1. Collect lists
1. Transform and unify lists
1. Audit lists (TBD.)
   - Person must have at least two names
   - All the members listed
1. Visualize lists

## Criteria

1. When was enlisted previously?
1. What was the committee that listed?
1. What was the rating in the list at the time enlisted?
1. What was the change in rating of the list from previous election?

## Space to improve

### Data aspects

- Add check if the member was in the council. `www.rinkejopuslapis.lt` has the data.
- With what legal entities has relations? VRK has the data.
- What is the bussiness domain, taxes situation, website of the related legal entity. `rekvizitai.lt` could be the source.
- Work experience. VRK has the data.
- Education. VRK has the data.
- Birth place. VRK has the data.
- Compare income with average monthly payment equivalent? E.g. how many average wages does the income contain.
- Check if the logical amount of taxes is paid?

### Technical aspects

- Use XML for less errors in parsing. With CSV some member applications parsed with errors (5 errors occured). No data displayed for these members.

## Source

### Publication sources

- https://www.vrk.lt/rinkimai
- https://www.vrk.lt/2011-savivaldybiu-tarybu
- https://www.vrk.lt/2015-savivaldybiu-tarybu
- https://www.vrk.lt/2019-savivaldybiu-tarybu
- https://www.vrk.lt/2023-savivaldybiu-tarybu-ir-meru-rinkimai

### APIs sources

- https://www.rinkejopuslapis.lt/ataskaitos87
