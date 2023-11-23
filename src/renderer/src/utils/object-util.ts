export const copyObj = (obj: object) => {
  return JSON.parse(JSON.stringify(obj))
}
