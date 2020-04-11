import { createUniqueId } from '../../utils/index'

export default class ScheduleEvent {
  readonly account = createUniqueId()
  readonly detail = {};
  readonly ['detail-type'] = 'Scheduled Event'
  readonly id = createUniqueId()
  readonly region: string
  readonly resources = []
  readonly source = 'aws.events'
  // format of aws displaying the time, e.g.: 2020-02-09T14:13:57Z
  readonly time = new Date().toISOString().replace(/\.(.*)(?=Z)/g, '')
  readonly version = '0'

  constructor(region: string) {
    this.region = region
  }
}
