const LAST_TRAINING_ROUTE_KEY = 'earjemp-last-training-route'

export const TRAINING_ROUTE_PATHS = [
    '/intervallJemp',
    '/chordJemp',
    '/inversions',
    '/scaleJemp',
    '/intonationJemp',
    '/melodyJemp'
]

export const DEFAULT_TRAINING_ROUTE = '/intervallJemp'

export function isTrainingRoute(path) {
    return TRAINING_ROUTE_PATHS.includes(path)
}

export function loadLastTrainingRoute() {
    if (typeof localStorage === 'undefined') return DEFAULT_TRAINING_ROUTE

    const savedPath = localStorage.getItem(LAST_TRAINING_ROUTE_KEY)
    return isTrainingRoute(savedPath) ? savedPath : DEFAULT_TRAINING_ROUTE
}

export function saveLastTrainingRoute(path) {
    if (typeof localStorage === 'undefined' || !isTrainingRoute(path)) return
    localStorage.setItem(LAST_TRAINING_ROUTE_KEY, path)
}
