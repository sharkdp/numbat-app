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
    "Frequency",
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

// Common derived units to show in unit overview
// These are valid Numbat expressions that aren't explicitly defined units
// but are commonly used and should appear in the unit list
const COMMON_DERIVED_UNITS = {
    "Velocity": [
        "m/s",
        "km/h",
        "mi/h",
        "furlongs per fortnight",
    ],
    "Acceleration": [
        "m/s²",
        "ft/s²",
    ],
    "Area": [
        "m²",
        "km²",
        "mi²",
        "cm²",
        "mm²",
        "ft²",
        "in²",
        "yd²",
    ],
    "Volume": [
        "m³",
        "l",
        "dl",
        "cl",
        "ml",
        "cm³",
        "gal",
        "ft³",
        "in³",
    ],
    "Pressure": [
        "Pa",
        "kPa",
        "MPa",
        "GPa",
        "bar",
        "mbar",
        "N/m²",
        "kg/(m·s²)",
        "lbf/in²",
    ],
    "Energy": [
        "J",
        "kJ",
        "MJ",
        "GJ",
        "mJ",
        "Wh",
        "kWh",
        "MWh",
        "GWh",
        "BTU",
        "cal",
        "kcal",
    ],
    "Power": [
        "W",
        "kW",
        "MW",
        "GW",
        "mW",
        "kg·m²/s³",
    ],
    "Force": [
        "N",
        "kN",
        "kg·m/s²",
        "lbf",
    ],
    "Density": [
        "kg/m³",
        "g/cm³",
        "kg/L",
        "g/mL",
        "lb/ft³",
        "lb/gal",
    ],
    "Frequency": [
        "Hz",
        "kHz",
        "MHz",
        "GHz",
        "THz",
        "1 / s",
        "1 / min",
        "1 / h",
    ],
    "DataRate": [
        "kB/s",
        "MB/s",
        "GB/s",
        "KiB/s",
        "MiB/s",
        "GiB/s",
        "kbit/s",
        "Mbit/s",
        "Gbit/s",
    ],
    "FlowRate": [
        "L/s",
        "L/min",
        "L/h",
        "m³/s",
        "m³/h",
        "gal/min",
        "ft³/min",
    ],
    "AngularVelocity": [
        "rad/s",
        "deg/s",
        "°/s",
    ],
    "Torque": [
        "N·m",
        "kN·m",
        "lbf·ft",
        "lbf·in",
    ],
    "Concentration": [
        "mol/L",
        "mmol/L",
        "mol/m³",
    ],
    "DigitalInformation": [
        "bit",
        "byte",
        "kB",
        "MB",
        "GB",
        "TB",
        "PB",
        "KiB",
        "MiB",
        "GiB",
        "TiB",
        "PiB",
        "kbit",
        "Mbit",
        "Gbit",
    ],
};

// Get common derived units for a dimension (or empty array if none)
function getCommonDerivedUnits(dimension) {
    return COMMON_DERIVED_UNITS[dimension] || [];
}

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

export { PRIORITY_DIMENSIONS, DIMENSION_ICONS, COMMON_DERIVED_UNITS, hasPriority, getPriorityIndex, getIcon, getCommonDerivedUnits };
