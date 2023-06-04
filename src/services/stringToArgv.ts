export default function stringToArgv(str: string) {
  const splittedString = str.replace(/\\"/gm, "###escapedquotes###").match(/("[^"]+"|[^\s"]+)/gm)
  return splittedString?.map(str => str.replace(/"/g, '').replace(/###escapedquotes###/g, '"'))
}