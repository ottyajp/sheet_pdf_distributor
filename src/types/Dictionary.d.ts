import { destinationNames } from '../constants/destinationNames';

const destinationNamesForType = [...destinationNames] as const;

export type DestinationNames = (typeof destinationNamesForType)[number];

export type Dictionary = {
    keyword: string;
    dest: DestinationNames;
    all?: boolean;
}[];
