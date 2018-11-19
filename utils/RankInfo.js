const scale = 200;

const Rank = {
	ldsg: "96335850576556032",
	excludeChannels: [
		"269137380751966208", // discord rpg
		"153309871297658880", // clip submissions
		"203518149809799168", // bot lobby
		"363020585988653057", // LDSG Team
		"405405857099284490", // star board
		"420653044326203402", // youth-antics
		"356657507197779968", // outer-darkness
		"121755900313731074"  // gifs-and-memes
	],
	excludeRoles: [],
	messages: [
		"Your future is looking so bright that I need sunglasses.",
		"Keep being awesome, and I'll keep saying congratulations.",
		"You have performed extremely adequately.",
		"I love it when good things happen to good people like you.",
		"My face has a proud smile because of you.",
		"I don't know if anyone has ever told you this before, but I think you are pretty great.",
		"Great things come from great people.",
		"I'm thinking of a word for you that starts with \"C\" and ends in \"ongratulations.\"",
		"I love your accomplishments almost as much as I love the person who did them.",
		"Thanks for giving me a good reason to say congratulations!",
		"You surprised me a little bit. I knew you were capable, but I didn't expect this level of accomplishment!",
		"I am excited for you, and I am wishing you the best.",
		"Just when I thought you couldn't impress me anymore, you did.",
		"I am proud of you. You have accomplished a lot.",
		"You deserve all the great things that are coming. Enjoy!",
		"I love to see good things come to good people. This is one of those times.",
		"The waiting is over! It's time to celebrate!",
		"Enjoy this time. Life is an adventure, and you are living it well!",
		"I can't think of any advice I need to give you. You have proven your competence.",
		"I have always known that good things would come your way. Your persistence is paying off!",
		"Sometimes I make a big deal about nothing, but this time I'm not exaggerating. Way to go!",
		"It's just one word, but it sums up what I want to express. Congratulations!",
		"I need to congratulate both of us because I knew you'd be successful!",
		"There's a time for everything, and right now is the time to say congratulations to you."
	],
	levelPhrase: [
		"Welcome to LDSG Chat **Level %LEVEL%**!",
		"**Level %LEVEL%** in LDSG chat is yours.",
		"You reached **Level %LEVEL%** in LDSG chat!",
		"LDSG Chat **Level %LEVEL%** belongs to you.",
		"Do something nice with **Level %LEVEL%** in LDSG chat."
	],
	level: function(xp) {
		xp = parseInt(xp, 10);
		return Math.floor((1 + Math.sqrt(1 + (8 * xp)/scale))/2);
	},
	minXp: function(level) {
		level = parseInt(level, 10);
		return scale * (Math.pow(2 * level - 1, 2) - 1) / 8;
	},
	rewards: new Map([
		[10, {
			name: "Novice",
			id: "203208457363390464"
		}],
		[30, {
			name: "Veteran",
			id: "202935950119010304"
		}],
		[50, {
			name: "Hero",
			id: "202936107472650240"
		}],
		[80, {
			name: "Legend",
			id: "202935996164079617"
		}],
		[90, {
			name: "Ancient",
			id: "202936368362422275"
		}]
	])
}
module.exports = Rank;
