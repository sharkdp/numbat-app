// Metadata for physical dimensions

// Priority dimensions in display order (thematically grouped)
const PRIORITY_DIMENSIONS = [
    // Spatial
    "Length",
    "Area",
    "Volume",
    "Angle",
    // Temporal / Motion
    "Time",
    "Velocity",
    "Acceleration",
    // Mechanics
    "Mass",
    "Force",
    "Pressure",
    "Energy",
    "Power",
    // Thermal
    "Temperature",
    // Digital / Money
    "DigitalInformation",
    "Money",
];

// Icon mapping for dimensions (Lucide icon names, see https://lucide.dev/icons)
const DIMENSION_ICONS = {
    // SI base dimensions
    "Length": "ruler",
    "Mass": "weight",
    "Time": "clock",
    "ElectricCurrent": "zap",
    "Temperature": "thermometer",
    "AmountOfSubstance": "flask-conical",
    "LuminousIntensity": "lightbulb",

    // Common derived/other dimensions
    "DigitalInformation": "binary",
    "Money": "banknote",
    "Area": "square",
    "Volume": "box",
    "Velocity": "gauge",
    "Frequency": "activity",
    "Force": "biceps-flexed",
    "Pressure": "fire-extinguisher",
    "Energy": "battery-full",
    "Power": "plug",
    "Voltage": "zap",
    "ElectricResistance": "omega",
    "Angle": "triangle-right",
    "Acceleration": "trending-up",
    "Density": "layers",
    "Speed": "gauge",

    // Radiation & nuclear
    "AbsorbedDose": "radiation",
    "Activity": "atom",
    "EquivalentDose": "radiation",

    // Electromagnetic
    "ElectricCharge": "circle-plus",
    "Capacitance": "cylinder",
    "Inductance": "rotate-3d",
    "MagneticFlux": "magnet",
    "MagneticFluxDensity": "magnet",
    "ElectricConductance": "cable",
    "MagneticFieldStrength": "magnet",

    // Light & optics
    "Illuminance": "sun",
    "LuminousFlux": "lightbulb",
    "SolidAngle": "cone",
    "Luminance": "sun-dim",
    "RadiantFlux": "sun",
    "SpectralFluxDensity": "rainbow",

    // Mechanics
    "Torque": "rotate-cw",
    "AngularVelocity": "refresh-cw",
    "AngularAcceleration": "rotate-cw",
    "Momentum": "arrow-right",
    "MomentOfInertia": "rotate-3d",

    // Thermodynamics
    "Entropy": "shuffle",
    "HeatCapacity": "flame",
    "ThermalConductivity": "thermometer",
    "SpecificHeatCapacity": "flame",

    // Fluid dynamics
    "DynamicViscosity": "droplet",
    "KinematicViscosity": "droplets",
    "FlowRate": "waves",
    "VolumetricFlowRate": "waves",
    "MassFlowRate": "waves",

    // Chemistry
    "CatalyticActivity": "flask-round",
    "Concentration": "beaker",
    "MolarMass": "flask-conical",
    "Molality": "flask-conical",
    "Molarity": "flask-conical",

    // Other
    "Wavenumber": "audio-waveform",
    "DataRate": "wifi",

    // Music / Audio
    "Beat": "music",
    "Beat / Time": "music",

    // Aliases
    "Current": "zap",
    "Length^2": "square",

    // Display / Printing
    "Dot": "circle-dot",
    "Dot / Length": "scan-line",
    "Pixel": "grid-2x2",
    "Pixel / Length": "scan-line",

    // Video
    "Frame": "frame",
    "Frame / Time": "clapperboard",

    // Counting units
    "Person": "user",
    "Piece": "puzzle",

    // Time
    "UnixTime": "calendar-clock",

    // Derived (placeholder)
    "Force / Volume": "hash",
    "Length / Volume": "hash",

    // Programming
    "LinesOfCode": "file-code",
};

// Check if a dimension has priority
function hasPriority(dimension) {
    return PRIORITY_DIMENSIONS.includes(dimension);
}

// Get the priority index for sorting (-1 if not a priority dimension)
function getPriorityIndex(dimension) {
    return PRIORITY_DIMENSIONS.indexOf(dimension);
}

// Get the Lucide icon name for a dimension (or null if none)
function getIcon(dimension) {
    return DIMENSION_ICONS[dimension] || null;
}

export { PRIORITY_DIMENSIONS, DIMENSION_ICONS, hasPriority, getPriorityIndex, getIcon };
