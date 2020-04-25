import execa from 'execa'

export default async function checkDockerDaemon(): Promise<void> {
  let dockerServerOS: string

  try {
    const { stdout } = await execa('docker', [
      'version',
      '--format',
      '{{.Server.Os}}',
    ])
    dockerServerOS = stdout
  } catch (err) {
    throw new Error('The docker daemon is not running.')
  }

  if (dockerServerOS !== 'linux') {
    throw new Error('Please switch docker daemon to linux mode.')
  }
}
