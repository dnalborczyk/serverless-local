import execa from 'execa'

export default async function detectExecutable(exe: string): Promise<boolean> {
  try {
    const { failed } = await execa(exe, ['--version'])

    return failed === false
  } catch (err) {
    return false
  }
}
