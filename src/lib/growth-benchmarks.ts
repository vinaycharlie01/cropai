
// A curated dataset of ideal crop growth stages.
// In a real-world application, this would be a much larger database,
// potentially stored in Firestore and managed by agricultural experts.

interface Benchmark {
    day: number;
    description: string;
}

const cropBenchmarks: Record<string, Benchmark[]> = {
    tomato: [
        { day: 7, description: "Seedling emerges with two cotyledons (seed leaves)." },
        { day: 14, description: "First true leaves appear. Stem is thin but sturdy." },
        { day: 21, description: "Plant has 3-5 true leaves and is about 4-6 inches tall." },
        { day: 30, description: "Plant has 6-10 leaves, stem is thickening. May show first signs of tiny flower buds." },
        { day: 45, description: "Flowering begins. Plant is bushy and about 1-1.5 feet tall." },
        { day: 60, description: "Small green fruits (about 1cm) are visible. Active flowering continues." },
        { day: 75, description: "Fruits are growing in size and number. First fruits may start to show a change in color (breaker stage)." },
        { day: 90, description: "Harvesting begins. Multiple clusters of ripe fruit are present." },
    ],
    onion: [
        { day: 10, description: "Germination and emergence of a single, grass-like leaf." },
        { day: 25, description: "Plant has 2-3 true leaves. The base has not yet started to swell." },
        { day: 45, description: "Plant has 5-6 leaves. The base of the plant begins to swell, indicating the start of bulb formation." },
        { day: 70, description: "Bulb is noticeably larger. Leaf growth continues, adding layers to the bulb." },
        { day: 100, description: "Tops are large and healthy. The bulb is near its final size but still firming up." },
        { day: 120, description: "Tops begin to yellow and fall over, indicating maturity. The bulb is fully formed and ready for harvest." },
    ],
    wheat: [
        { day: 7, description: "Germination complete, single shoot emerges (coleoptile)." },
        { day: 15, description: "Tillering begins. 2-3 leaves have unfolded, and secondary shoots (tillers) start to grow from the base." },
        { day: 30, description: "Active tillering. The plant is bushy with multiple tillers." },
        { day: 50, description: "Stem elongation (jointing) starts. The main stem begins to grow taller, and nodes are visible." },
        { day: 70, description: "Booting stage. The head (spike) is enclosed in the sheath of the flag leaf." },
        { day: 80, description: "Heading (flowering). The head has fully emerged from the flag leaf sheath." },
        { day: 100, description: "Grain fill (milk stage). Grains are soft and contain a milky fluid." },
        { day: 120, description: "Ripening. The plant turns golden yellow, and the grain hardens. Ready for harvest." },
    ]
};

/**
 * Gets the ideal growth benchmark for a given crop and age.
 * @param cropType The type of crop (e.g., "tomato").
 * @param daysSincePlanting The number of days since the crop was planted.
 * @returns A string describing the ideal state, or a default message.
 */
export function getGrowthBenchmark(cropType: string, daysSincePlanting: number): string {
    const normalizedCropType = cropType.toLowerCase();
    const benchmarks = cropBenchmarks[normalizedCropType];

    if (!benchmarks) {
        return "No specific benchmark data available for this crop.";
    }

    // Find the closest benchmark that is less than or equal to the current day.
    let applicableBenchmark = benchmarks[0];
    for (const benchmark of benchmarks) {
        if (daysSincePlanting >= benchmark.day) {
            applicableBenchmark = benchmark;
        } else {
            break; // Stop once we've passed the current day
        }
    }

    return applicableBenchmark.description;
}
