// [0, 1, 2, 3, 4 ,5] => [[0, 1], [2, 3], [4, 5]]
export default function unflatten<T>(value: readonly T[], size: number): T[][] {
  const unflattened = []

  for (let i = 0; i < value.length; i += size) {
    const slice = value.slice(i, i + size)
    unflattened.push(slice)
  }

  return unflattened
}
