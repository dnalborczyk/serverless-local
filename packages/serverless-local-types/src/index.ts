import type { FunctionDefinition } from 'serverless'

export interface LambdaCreateOptions {
  functionKey: string
  functionDefinition: FunctionDefinition
}

export interface HttpCreateOptions {
  functionKey: string
  handler: string
  http: any
}

export interface ScheduleCreateOptions {
  functionKey: string
  schedule: any
}

export interface WebSocketCreateOptions {
  functionKey: string
  websocket: any
}
