export const chipColors = {
	green: /*tw*/ 'border-green-400 text-green-400 bg-green-400 bg-opacity-10',
	yellow: /*tw*/ 'border-yellow-400 text-yellow-400 bg-yellow-400 bg-opacity-10',
	indigo: /*tw*/ 'border-indigo-400 text-indigo-400 bg-indigo-400 bg-opacity-10',
	orange: /*tw*/ 'border-orange-400 text-orange-400 bg-orange-400 bg-opacity-10',
	teal: /*tw*/ 'border-teal-400 text-teal-400 bg-teal-400 bg-opacity-10',
	red: /*tw*/ 'border-red-400 text-red-400 bg-red-400 bg-opacity-10',
	purple: /*tw*/ 'border-purple-400 text-purple-400 bg-purple-400 bg-opacity-10',
	amber: /*tw*/ 'border-amber-400 text-amber-400 bg-amber-400 bg-opacity-10',
	sky: /*tw*/ 'border-sky-400 text-sky-400 bg-sky-400 bg-opacity-10',
	pink: /*tw*/ 'border-pink-400 text-pink-400 bg-pink-400 bg-opacity-10',
	emerald: /*tw*/ 'border-emerald-400 text-emerald-400 bg-emerald-400 bg-opacity-10',
	fuchsia: /*tw*/ 'border-fuchsia-400 text-fuchsia-400 bg-fuchsia-400 bg-opacity-10',
	lime: /*tw*/ 'border-lime-400 text-lime-400 bg-lime-400 bg-opacity-10',
	blue: /*tw*/ 'border-blue-400 text-blue-400 bg-blue-400 bg-opacity-10',
	violet: /*tw*/ 'border-violet-400 text-violet-400 bg-violet-400 bg-opacity-10',
	cyan: /*tw*/ 'border-cyan-400 text-cyan-400 bg-cyan-400 bg-opacity-10',
	rose: /*tw*/ 'border-rose-400 text-rose-400 bg-rose-400 bg-opacity-10',
};

export const disabledColor = /*tw*/ 'border-gray-400 text-gray-400 bg-gray-400 bg-opacity-10';

export const randomColor = () => {
	const colorKeys = Object.keys(chipColors);
	const randomIndex = Math.floor(Math.random() * colorKeys.length);
	return colorKeys[randomIndex] as keyof typeof chipColors;
};