// Import required modules
const fs = require("fs");

// Load team data from groups.json
const groupsData = JSON.parse(fs.readFileSync("./groups.json", "utf-8"));
const exhibitionsData = JSON.parse(fs.readFileSync("exhibitions.json", "utf8"));

// Function to generate a random score influenced by FIBA ranking difference
function generateRandomScore(team1rank, team2rank) {
	// Determine base scores
	let baseScore = 70;
	let rankDifference = team2rank - team1rank;
	// Calculate scores with random variance
	let scoreA = baseScore + Math.floor(Math.random() * 31) + rankDifference;
	let scoreB = baseScore + Math.floor(Math.random() * 31) - rankDifference;

	return { team1Score: scoreA, team2Score: scoreB };
}

// Initialize teams in a structure for easy access and manipulation
function initializeTeams(groups) {
	let teams = {};
	for (const [group, teamList] of Object.entries(groups)) {
		teams[group] = teamList.map((team) => ({
			name: team.Team,
			rank: team.FIBARanking,
			points: 0,
			scored: 0,
			conceded: 0,
			matches: [],
		}));
	}
	return teams;
}

// Simulate all matches in the group stage
function simulateGroupStage(teams) {
	for (const [group, teamList] of Object.entries(teams)) {
		for (let i = 0; i < teamList.length; i++) {
			for (let j = i + 1; j < teamList.length; j++) {
				const teamA = teamList[i];
				const teamB = teamList[j];
				const { team1Score, team2Score } = generateRandomScore(
					teamA.rank,
					teamB.rank
				);

				// Update teams with match results
				teamA.scored += team1Score;
				teamA.conceded += team2Score;
				teamB.scored += team2Score;
				teamB.conceded += team1Score;

				if (team1Score > team2Score) {
					teamA.points += 2;
					teamB.points += 1;
				} else {
					teamA.points += 1;
					teamB.points += 2;
				}

				// Log match result
				teamA.matches.push({
					opponent: teamB.name,
					score: team1Score,
					opponentScore: team2Score,
				});
				teamB.matches.push({
					opponent: teamA.name,
					score: team2Score,
					opponentScore: team1Score,
				});
			}
		}
	}
}

function displayGroupStandings(teams) {
	console.log("Grupna faza");
	// Determine the number of rounds based on the number of teams in a group
	const rounds = teams.A.length - 1; // Since each team plays against every other team

	for (let round = 1; round <= rounds; round++) {
		console.log(`Kolo ${round}:`);

		for (const [group, teamList] of Object.entries(teams)) {
			console.log(`    Grupa ${group}:`);
			const matchesInRound = [];

			// Collect all matches for this round
			teamList.forEach((team) => {
				team.matches.forEach((match) => {
					// Only display matches once and match them by the round index
					if (match.score > match.opponentScore) {
						matchesInRound.push(
							`${team.name} - ${match.opponent} (${match.score}:${match.opponentScore})`
						);
					}
				});
			});

			// Display collected matches for the current round
			matchesInRound.forEach((match) => {
				console.log(`        ${match}`);
			});
		}
	}
	console.log("Konačan plasman u grupama:");

	for (const [group, teamList] of Object.entries(teams)) {
		// Sort teams first by points, then by head-to-head results, and finally by points difference
		teamList.sort((teamA, teamB) => {
			if (teamA.points !== teamB.points) {
				return teamB.points - teamA.points; // Sort by points (descending)
			}

			// Head-to-head check if points are tied (only applicable if exactly 2 teams are tied)
			const headToHeadMatch = teamA.matches.find(
				(match) => match.opponent === teamB.name
			);
			if (
				headToHeadMatch &&
				headToHeadMatch.score !== headToHeadMatch.opponentScore
			) {
				return headToHeadMatch.score > headToHeadMatch.opponentScore ? -1 : 1;
			}

			// Sort by points difference if head-to-head is tied or if there are more than 2 teams tied
			const teamADifference = teamA.scored - teamA.conceded;
			const teamBDifference = teamB.scored - teamB.conceded;
			return teamBDifference - teamADifference; // Sort by points difference (descending)
		});

		console.log(
			`    Grupa ${group} (Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika):`
		);

		teamList.forEach((team, index) => {
			const wins = team.matches.filter(
				(match) => match.score > match.opponentScore
			).length;
			const losses = team.matches.filter(
				(match) => match.score < match.opponentScore
			).length;
			const scored = team.scored;
			const conceded = team.conceded;
			const pointsDifference = scored - conceded;

			// Format the standings for each team
			console.log(
				`        ${index + 1}. ${team.name.padEnd(12)} ${wins} / ${losses} / ${
					team.points
				} / ${scored} / ${conceded} / ${
					pointsDifference >= 0 ? "+" : ""
				}${pointsDifference}`
			);
		});
	}
}

// Rank teams within each group
function rankTeams(teams) {
	for (const [group, teamList] of Object.entries(teams)) {
		// Sort by points, then point difference, then points scored
		teamList.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			const diffA = a.scored - a.conceded;
			const diffB = b.scored - b.conceded;
			if (diffB !== diffA) return diffB - diffA;
			return b.scored - a.scored;
		});
	}
}

// Assign overall ranks to teams from all groups
function assignOverallRanks(teams) {
	const rankedTeams = [];
	for (const [group, teamList] of Object.entries(teams)) {
		teamList.forEach((team, index) => {
			rankedTeams.push({ ...team, group, position: index + 1 });
		});
	}

	// Group teams by their finishing position within their group
	const firstPlaceTeams = rankedTeams.filter((team) => team.position === 1);
	const secondPlaceTeams = rankedTeams.filter((team) => team.position === 2);
	const thirdPlaceTeams = rankedTeams.filter((team) => team.position === 3);

	// Sort teams within each group of positions
	const rankTeamsByCriteria = (teams) =>
		teams.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			const diffA = a.scored - a.conceded;
			const diffB = b.scored - b.conceded;
			if (diffB !== diffA) return diffB - diffA;
			return b.scored - a.scored;
		});

	// Rank first, second, and third place teams
	const rankedFirstPlaceTeams = rankTeamsByCriteria(firstPlaceTeams);
	const rankedSecondPlaceTeams = rankTeamsByCriteria(secondPlaceTeams);
	const rankedThirdPlaceTeams = rankTeamsByCriteria(thirdPlaceTeams);

	// Combine and assign ranks
	return [
		...rankedFirstPlaceTeams.map((team, index) => ({
			...team,
			FIBARanking: index + 1,
		})),
		...rankedSecondPlaceTeams.map((team, index) => ({
			...team,
			FIBARanking: index + 4,
		})),
		...rankedThirdPlaceTeams.map((team, index) => ({
			...team,
			FIBARanking: index + 7,
		})),
	];
}

// Simulate elimination phase based on knockout rules
function simulateEliminationPhase(rankedTeams) {
	// Seed teams into pots
	const potD = rankedTeams.filter(
		(team) => team.FIBARanking === 1 || team.FIBARanking === 2
	);
	const potE = rankedTeams.filter(
		(team) => team.FIBARanking === 3 || team.FIBARanking === 4
	);
	const potF = rankedTeams.filter(
		(team) => team.FIBARanking === 5 || team.FIBARanking === 6
	);
	const potG = rankedTeams.filter(
		(team) => team.FIBARanking === 7 || team.FIBARanking === 8
	);

	// Match pots according to rules
	const quarterfinalPairs = [
		[potD[0], potG[1]],
		[potD[1], potG[0]],
		[potE[0], potF[1]],
		[potE[1], potF[0]],
	];

	// Function to simulate a single match
	const simulateMatch = (teamA, teamB) => {
		const { team1Score, team2Score } = generateRandomScore(
			teamA.rank,
			teamB.rank
		);
		return team1Score > team2Score ? teamA : teamB;
	};

	// Simulate quarterfinals
	const quarterfinalWinners = quarterfinalPairs.map(([teamA, teamB]) =>
		simulateMatch(teamA, teamB)
	);

	// Simulate semifinals
	const semifinalPairs = [
		[quarterfinalWinners[0], quarterfinalWinners[1]],
		[quarterfinalWinners[2], quarterfinalWinners[3]],
	];
	const semifinalWinners = semifinalPairs.map(([teamA, teamB]) =>
		simulateMatch(teamA, teamB)
	);

	// Determine third place
	const thirdPlaceMatch = simulateMatch(
		semifinalPairs[0].find((team) => !semifinalWinners.includes(team)),
		semifinalPairs[1].find((team) => !semifinalWinners.includes(team))
	);

	// Simulate final
	const finalWinner = simulateMatch(semifinalWinners[0], semifinalWinners[1]);

	// Print results
	console.log("Eliminicaiona faza:");
	console.log("Četvrtfinale:");
	quarterfinalPairs.forEach(([teamA, teamB], index) => {
		const winner = quarterfinalWinners[index];
		console.log(`${teamA.name} vs ${teamB.name} - Winner: ${winner.name}`);
	});

	console.log("Polufinale:");
	semifinalPairs.forEach(([teamA, teamB], index) => {
		const winner = semifinalWinners[index];
		console.log(`${teamA.name} vs ${teamB.name} - Winner: ${winner.name}`);
	});

	console.log(`Finale: ${finalWinner.name}`);

	console.log("Medalje:");
	console.log(`1. Mesto: ${finalWinner.name}`);
	console.log(
		`2. Mesto: ${semifinalWinners.find((team) => team !== finalWinner).name}`
	);
	console.log(`3. Mesto: ${thirdPlaceMatch.name}`);
}

// Main function to execute the simulation
function main() {
	const teams = initializeTeams(groupsData);
	simulateGroupStage(teams);
	displayGroupStandings(teams);
	rankTeams(teams);
	const rankedTeams = assignOverallRanks(teams);
	simulateEliminationPhase(rankedTeams);
}

// Run the simulation
main();
