import { eventWithTime } from 'rrweb/typings/types'

interface Metadata {
    playerTime: number
}

export interface PageMetadata extends Metadata {
    href: string
}

export interface SizeMetadata extends Metadata {
    size: string
}

export interface LibCustomEvent {
    type: 5
    data: {
        tag: string
        payload: any
    }
}

export class EventIndex {
    events: eventWithTime[]
    baseTime: number
    _filterByCaches: { [key: string]: any[] }

    constructor(events: eventWithTime[]) {
        this.events = events
        this.baseTime = events.length > 0 ? events[0].timestamp : 0
        this._filterByCaches = {}
    }

    getDuration = (): number =>
        this.events[this.events.length - 1].timestamp - this.events[0].timestamp

    getPageMetadata = (
        playerTime: number
    ): [PageMetadata, number] | [null, -1] =>
        this._findCurrent(playerTime, this.pageChangeEvents())

    getSizeMetadata = (
        playerTime: number
    ): [SizeMetadata, number] | [null, -1] =>
        this._findCurrent(playerTime, this.sizeEvents())

    pageChangeEvents = (): PageMetadata[] =>
        this._filterBy('href', (event) => {
            if ('href' in event.data) {
                return {
                    href: (event.data as { href: string }).href,
                    playerTime: event.timestamp - this.baseTime
                }
            }
            if (
                event.type === 5 &&
                (event as LibCustomEvent).data.tag === '$pageview'
            ) {
                return {
                    href: (event as LibCustomEvent).data.payload.href,
                    playerTime: event.timestamp - this.baseTime
                }
            }

            return null
        })

    sizeEvents = (): SizeMetadata[] =>
        this._filterBy('size', (event) => {
            if ('width' in event.data && 'height' in event.data) {
                const { width, height } = event.data
                return {
                    size: `${width} x ${height}`,
                    playerTime: event.timestamp - this.baseTime
                }
            }
            return null
        })

    _findCurrent = <T extends Metadata>(
        playerTime: number,
        events: T[]
    ): [T, number] | [null, -1] => {
        let index = events.findIndex((event) => event.playerTime > playerTime)

        if (index === 0) {
            return [events[0], 0]
        } else if (index === -1) {
            index = events.length - 1
            return [events[index], index]
        }
        return [events[index - 1], index - 1]
    }

    _filterBy = <T extends Record<string, V>, V>(
        dataKey: string,
        transformer: (e: eventWithTime) => T | null
    ): T[] => {
        if (!this._filterByCaches[dataKey]) {
            let lastValueKey: V | undefined

            this._filterByCaches[dataKey] = this.events
                .map(transformer)
                .filter((value: T | null) => !!value)
                .filter((value: T) => {
                    if (value[dataKey] !== lastValueKey) {
                        lastValueKey = value[dataKey]
                        return true
                    }
                    return false
                })
        }
        return this._filterByCaches[dataKey] as T[]
    }
}