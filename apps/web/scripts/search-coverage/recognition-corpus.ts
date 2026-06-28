// Recognition corpus — the "coverage" half of the search-coverage harness.
//
// These are titles a broad range of audiences would expect any TV+anime rec
// app to recognise. UNLIKE the popularity half (pulled from our own catalog by
// popularity_score, which is circular), this list is sourced independently of
// our sync distribution — so a miss here is a real signal:
//   - title NOT in catalog        -> genuine coverage gap (sync thresholds too narrow)
//   - title in catalog but missed -> matching/ranking bug
//
// Deliberately weighted toward titles that stress the sync's vote-count floors:
// older/classic TV, telenovelas, Turkish/Chinese/Korean drama, Bollywood,
// classic anime, and kids' shows — the audiences most likely to be under-served
// by a popularity-ranked TMDB/AniList pull.
//
// `expectedType` is the medium we'd expect the canonical match to be. It's used
// to flag medium mismatches in the report, NOT to fail a match (a title found
// under a different medium still counts as found).

export type ExpectedType = 'tv' | 'film' | 'anime';

export interface RecognitionEntry {
  title: string;
  expectedType: ExpectedType;
  audience: string; // grouping label for the report breakdown
}

export const recognitionCorpus: RecognitionEntry[] = [
  // --- Prestige / mainstream US & UK TV ---
  { title: 'Breaking Bad', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'The Sopranos', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'The Wire', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Game of Thrones', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Mad Men', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Better Call Saul', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Succession', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'The Crown', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Chernobyl', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'True Detective', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Westworld', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Severance', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'The Last of Us', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'House of the Dragon', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Peaky Blinders', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Fleabag', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Sherlock', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Black Mirror', expectedType: 'tv', audience: 'prestige-tv' },
  { title: 'Stranger Things', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'The Boys', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'Wednesday', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'The Mandalorian', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'Ted Lasso', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'The Walking Dead', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'Lost', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'Dexter', expectedType: 'tv', audience: 'mainstream-tv' },
  { title: 'House', expectedType: 'tv', audience: 'mainstream-tv' },

  // --- Sitcoms / comfort TV ---
  { title: 'Friends', expectedType: 'tv', audience: 'sitcom' },
  { title: 'The Office', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Seinfeld', expectedType: 'tv', audience: 'sitcom' },
  { title: 'The Big Bang Theory', expectedType: 'tv', audience: 'sitcom' },
  { title: 'How I Met Your Mother', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Parks and Recreation', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Brooklyn Nine-Nine', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Modern Family', expectedType: 'tv', audience: 'sitcom' },
  { title: "It's Always Sunny in Philadelphia", expectedType: 'tv', audience: 'sitcom' },
  { title: 'Arrested Development', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Curb Your Enthusiasm', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Frasier', expectedType: 'tv', audience: 'sitcom' },
  { title: 'Cheers', expectedType: 'tv', audience: 'sitcom' },

  // --- Classic / older TV (stress vote-count floors) ---
  { title: 'The Twilight Zone', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'I Love Lucy', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'M*A*S*H', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Columbo', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Star Trek', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Doctor Who', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Fawlty Towers', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Blackadder', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Only Fools and Horses', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'The Fresh Prince of Bel-Air', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'The Golden Girls', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Buffy the Vampire Slayer', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'The X-Files', expectedType: 'tv', audience: 'classic-tv' },
  { title: 'Twin Peaks', expectedType: 'tv', audience: 'classic-tv' },

  // --- Reality / competition ---
  { title: 'The Great British Bake Off', expectedType: 'tv', audience: 'reality' },
  { title: "RuPaul's Drag Race", expectedType: 'tv', audience: 'reality' },
  { title: 'Survivor', expectedType: 'tv', audience: 'reality' },
  { title: 'Love Island', expectedType: 'tv', audience: 'reality' },
  { title: 'MasterChef', expectedType: 'tv', audience: 'reality' },
  { title: 'Top Gear', expectedType: 'tv', audience: 'reality' },

  // --- Korean drama ---
  { title: 'Squid Game', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Crash Landing on You', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Goblin', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Itaewon Class', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Vincenzo', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Reply 1988', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Kingdom', expectedType: 'tv', audience: 'k-drama' },
  { title: 'Sweet Home', expectedType: 'tv', audience: 'k-drama' },

  // --- Spanish / European drama ---
  { title: 'Money Heist', expectedType: 'tv', audience: 'euro-drama' },
  { title: 'Dark', expectedType: 'tv', audience: 'euro-drama' },
  { title: 'Narcos', expectedType: 'tv', audience: 'euro-drama' },
  { title: 'Elite', expectedType: 'tv', audience: 'euro-drama' },
  { title: 'Lupin', expectedType: 'tv', audience: 'euro-drama' },

  // --- Telenovela / Latin American ---
  { title: 'Yo soy Betty, la fea', expectedType: 'tv', audience: 'telenovela' },
  { title: 'La Reina del Sur', expectedType: 'tv', audience: 'telenovela' },
  { title: 'Café con aroma de mujer', expectedType: 'tv', audience: 'telenovela' },

  // --- Turkish / Chinese drama ---
  { title: 'Diriliş: Ertuğrul', expectedType: 'tv', audience: 'turkish-cdrama' },
  { title: 'Kara Sevda', expectedType: 'tv', audience: 'turkish-cdrama' },
  { title: 'The Untamed', expectedType: 'tv', audience: 'turkish-cdrama' },
  { title: 'Story of Yanxi Palace', expectedType: 'tv', audience: 'turkish-cdrama' },

  // --- Indian TV & film ---
  { title: 'Sacred Games', expectedType: 'tv', audience: 'indian' },
  { title: 'Mirzapur', expectedType: 'tv', audience: 'indian' },
  { title: 'The Family Man', expectedType: 'tv', audience: 'indian' },
  { title: '3 Idiots', expectedType: 'film', audience: 'indian' },
  { title: 'Dangal', expectedType: 'film', audience: 'indian' },
  { title: 'Lagaan', expectedType: 'film', audience: 'indian' },
  { title: 'Dilwale Dulhania Le Jayenge', expectedType: 'film', audience: 'indian' },
  { title: 'RRR', expectedType: 'film', audience: 'indian' },
  { title: 'Baahubali: The Beginning', expectedType: 'film', audience: 'indian' },
  { title: 'Gully Boy', expectedType: 'film', audience: 'indian' },

  // --- Kids / family TV ---
  { title: 'SpongeBob SquarePants', expectedType: 'tv', audience: 'kids' },
  { title: 'Avatar: The Last Airbender', expectedType: 'tv', audience: 'kids' },
  { title: 'Bluey', expectedType: 'tv', audience: 'kids' },
  { title: 'Peppa Pig', expectedType: 'tv', audience: 'kids' },
  { title: 'Paw Patrol', expectedType: 'tv', audience: 'kids' },
  { title: 'Gravity Falls', expectedType: 'tv', audience: 'kids' },
  { title: 'Adventure Time', expectedType: 'tv', audience: 'kids' },
  { title: 'Phineas and Ferb', expectedType: 'tv', audience: 'kids' },
  { title: 'Scooby-Doo, Where Are You!', expectedType: 'tv', audience: 'kids' },
  { title: 'Tom and Jerry', expectedType: 'tv', audience: 'kids' },

  // --- Anime: shonen / modern hits ---
  { title: 'Naruto', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'One Piece', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Dragon Ball Z', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Bleach', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Attack on Titan', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Demon Slayer', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'My Hero Academia', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Jujutsu Kaisen', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Hunter x Hunter', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Chainsaw Man', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Spy x Family', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'One Punch Man', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Tokyo Ghoul', expectedType: 'anime', audience: 'anime-shonen' },
  { title: 'Sword Art Online', expectedType: 'anime', audience: 'anime-shonen' },

  // --- Anime: classics / acclaimed (stress AniList top-N cap) ---
  { title: 'Death Note', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Fullmetal Alchemist: Brotherhood', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Cowboy Bebop', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Neon Genesis Evangelion', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Steins;Gate', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Code Geass', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Vinland Saga', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Mob Psycho 100', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Berserk', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Monster', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Rurouni Kenshin', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Inuyasha', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Sailor Moon', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Pokémon', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Doraemon', expectedType: 'anime', audience: 'anime-classic' },
  { title: 'Yu-Gi-Oh!', expectedType: 'anime', audience: 'anime-classic' },

  // --- Anime films ---
  { title: 'Spirited Away', expectedType: 'anime', audience: 'anime-film' },
  { title: 'Your Name', expectedType: 'anime', audience: 'anime-film' },
  { title: 'Princess Mononoke', expectedType: 'anime', audience: 'anime-film' },
  { title: 'Akira', expectedType: 'anime', audience: 'anime-film' },
  { title: 'My Neighbor Totoro', expectedType: 'anime', audience: 'anime-film' },
  { title: 'Ghost in the Shell', expectedType: 'anime', audience: 'anime-film' },

  // --- Film: blockbuster / canon ---
  { title: 'The Shawshank Redemption', expectedType: 'film', audience: 'film-canon' },
  { title: 'The Godfather', expectedType: 'film', audience: 'film-canon' },
  { title: 'Pulp Fiction', expectedType: 'film', audience: 'film-canon' },
  { title: 'The Dark Knight', expectedType: 'film', audience: 'film-canon' },
  { title: 'Inception', expectedType: 'film', audience: 'film-canon' },
  { title: 'Forrest Gump', expectedType: 'film', audience: 'film-canon' },
  { title: 'Fight Club', expectedType: 'film', audience: 'film-canon' },
  { title: 'The Matrix', expectedType: 'film', audience: 'film-canon' },
  { title: 'Goodfellas', expectedType: 'film', audience: 'film-canon' },
  { title: "Schindler's List", expectedType: 'film', audience: 'film-canon' },
  { title: 'Interstellar', expectedType: 'film', audience: 'film-canon' },
  { title: 'Parasite', expectedType: 'film', audience: 'film-canon' },
  { title: 'Gladiator', expectedType: 'film', audience: 'film-canon' },
  { title: 'Titanic', expectedType: 'film', audience: 'film-canon' },

  // --- Film: franchise / family ---
  { title: 'Star Wars', expectedType: 'film', audience: 'film-franchise' },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    expectedType: 'film',
    audience: 'film-franchise',
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    expectedType: 'film',
    audience: 'film-franchise',
  },
  { title: 'Jurassic Park', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Avengers: Endgame', expectedType: 'film', audience: 'film-franchise' },
  { title: 'The Avengers', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Spider-Man: No Way Home', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Frozen', expectedType: 'film', audience: 'film-franchise' },
  { title: 'The Lion King', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Toy Story', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Finding Nemo', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Shrek', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Oppenheimer', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Barbie', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Dune', expectedType: 'film', audience: 'film-franchise' },
  { title: 'Top Gun: Maverick', expectedType: 'film', audience: 'film-franchise' },
];
