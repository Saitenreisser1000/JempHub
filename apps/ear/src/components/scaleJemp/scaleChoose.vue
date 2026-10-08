<template>
    <exercise-toolbar>
        <template #level>
                    <div class="menu-label">{{ $t('common.difficulty') }}</div>
                    <v-btn-toggle
                        v-model="localDifficulty"
                        class="text-white difficulty-toggle mb-2"
                        density="compact"
                        active-class="primary"
                        background-color="secondary"
                        mandatory
                    >
                        <v-btn value="scale1" size="small">1</v-btn>
                        <v-btn value="scale2" size="small">2</v-btn>
                        <v-btn value="scale3" size="small">3</v-btn>
                        <v-btn value="scale4" size="small">4</v-btn>
                        <v-btn value="scale5" size="small">5</v-btn>
                    </v-btn-toggle>
                    <div class="menu-label">{{ $t('common.direction') }}</div>
                    <v-btn-toggle
                        v-model="localPlayOrder"
                        class="text-white play-order-toggle"
                        dense
                        active-class="primary"
                        background-color="secondary"
                        multiple
                        mandatory
                    >
                        <v-btn value="increase">
                            <span>{{ $t('common.up') }}</span>
                        </v-btn>
                        <v-btn value="decrease">
                            <span>{{ $t('common.down') }}</span>
                        </v-btn>
                        <v-btn value="simultaneous">
                            <span>=</span>
                        </v-btn>
                    </v-btn-toggle>
                    <v-select
                        v-model="selectedScales"
                        :items="scales"
                        mandatory
                        :item-title="scaleTitle"
                        item-value="value"
                        return-object
                        :label="$t('common.selectScales')"
                        multiple
                        density="compact"
                        hide-details
                        class="mt-2"
                    >
                        <template #selection></template>
                    </v-select>
        </template>
        <template #options>
                    <v-switch
                        v-model="localAutoplay"
                        :label="$t('common.autoplay')"
                        class="my-0"
                        density="compact"
                        hide-details
                    />
                    <v-switch
                        v-model="localOffsetFirst"
                        :label="$t('common.firstToneOffset')"
                        class="my-0"
                        density="compact"
                        hide-details
                    />
                    <v-select
                        v-model="localResultDisplayMs"
                        :items="resultDisplayOptions"
                        item-title="label"
                        item-value="value"
                        :label="$t('common.resultDisplay')"
                        density="compact"
                        hide-details
                        class="mt-1"
                    />
        </template>
    </exercise-toolbar>
</template>

<script>
    import {mapActions} from "vuex";
    import ExerciseToolbar from "@/components/common/ExerciseToolbar";
    import { createScaleOptions, createDefaultSelectedScales } from "@/domain/music/definitions";
    import { scaleValuesForDifficulty } from "@/domain/music/difficulty";

export default {
        name: "scaleChoose",
        components: {ExerciseToolbar},
        props: {
            autoplay: {
                type: Boolean,
                default: true
            },
            offsetFirst: {
                type: Boolean,
                default: true
            },
            difficulty: {
                type: String,
                default: 'scale1'
            },
            playOrder: {
                type: Array,
                default: () => ['increase']
            },
            resultDisplayMs: {
                type: Number,
                default: 1500
            }
        },
        emits: ['update:autoplay', 'update:offsetFirst', 'update:difficulty', 'update:playOrder', 'update:resultDisplayMs'],
        data() {
            return {
                scales: createScaleOptions(),
                selectedScales: createDefaultSelectedScales(),
                resultDisplayOptions: [
                    { label: '0.5s', value: 500 },
                    { label: '1.0s', value: 1000 },
                    { label: '1.5s', value: 1500 },
                    { label: '2.0s', value: 2000 },
                    { label: '3.0s', value: 3000 }
                ]
            }
        },
        computed: {
            localAutoplay: {
                get() {
                    return this.autoplay;
                },
                set(value) {
                    this.$emit('update:autoplay', value);
                }
            },
            localOffsetFirst: {
                get() {
                    return this.offsetFirst;
                },
                set(value) {
                    this.$emit('update:offsetFirst', value);
                }
            },
            localDifficulty: {
                get() {
                    return this.difficulty;
                },
                set(value) {
                    this.$emit('update:difficulty', value);
                }
            },
            localPlayOrder: {
                get() {
                    return this.playOrder;
                },
                set(value) {
                    this.$emit('update:playOrder', value);
                }
            },
            localResultDisplayMs: {
                get() {
                    return this.resultDisplayMs;
                },
                set(value) {
                    this.$emit('update:resultDisplayMs', value);
                }
            }
        },

        methods: {
          ...mapActions(['setSelectedScales']),
          scaleTitle(item) {
            if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 1) {
              return this.$t('scales.major')
            }
            if ((this.difficulty === 'scale1' || this.difficulty === 'scale2') && item && item.value === 6) {
              return this.$t('scales.minor')
            }
            return item && item.labelKey ? this.$t(item.labelKey) : item.text
          }
        },

        watch: {
          difficulty: {
            immediate: true,
            handler(value) {
              const allowed = scaleValuesForDifficulty(value);
              this.selectedScales = this.scales.filter((item) => allowed.includes(item.value));
            }
          },
          selectedScales: {
            immediate: true,
            handler() {
              this.setSelectedScales(this.selectedScales)
            }
          }
        }
    }
</script>

<style scoped>
    .menu-label {
        color: rgba(0, 0, 0, 0.68);
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1.2;
        margin: 4px 0 6px;
    }
    .difficulty-toggle :deep(.v-btn) {
        text-transform: none !important;
        min-width: 36px;
    }
    .play-order-toggle {
        width: 170px;
        min-width: 170px;
    }
    .play-order-toggle :deep(.v-btn) {
        flex: 1 1 0;
        min-width: 0 !important;
        text-align: center;
    }
    .v-btn{
        text-transform: none !important;
    }
</style>
