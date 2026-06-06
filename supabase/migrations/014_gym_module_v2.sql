-- DoNext Gym module v2 schema, RLS, catalog seed, and RPC helpers.

CREATE TABLE IF NOT EXISTS gym_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT,
  name TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  movement_type TEXT NOT NULL,
  equipment TEXT NOT NULL,
  is_unilateral BOOLEAN DEFAULT false,
  default_rep_low INT NOT NULL CHECK (default_rep_low > 0),
  default_rep_high INT NOT NULL CHECK (default_rep_high >= default_rep_low),
  execution_cue TEXT DEFAULT '',
  rest_seconds INT DEFAULT 90 CHECK (rest_seconds > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_exercises_global_key ON gym_exercises(key) WHERE user_id IS NULL AND key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gym_exercises_user ON gym_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_exercises_muscle ON gym_exercises(primary_muscle);
ALTER TABLE gym_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read global and own gym exercises" ON gym_exercises;
CREATE POLICY "Users read global and own gym exercises" ON gym_exercises FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own gym exercises" ON gym_exercises;
CREATE POLICY "Users create own gym exercises" ON gym_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own gym exercises" ON gym_exercises;
CREATE POLICY "Users update own gym exercises" ON gym_exercises FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own gym exercises" ON gym_exercises;
CREATE POLICY "Users delete own gym exercises" ON gym_exercises FOR DELETE USING (auth.uid() = user_id);

WITH catalog AS (
  SELECT * FROM jsonb_to_recordset($catalog$[
  {
    "key": "incline_db_press",
    "name": "Incline dumbbell press",
    "primary_muscle": "chest",
    "secondary_muscles": [
      "shoulders_front",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Bench 30-45 deg. Lower to upper chest, elbows ~45 deg from torso, full stretch at bottom, press up and slightly in.",
    "rest_seconds": 150
  },
  {
    "key": "flat_barbell_bench",
    "name": "Flat barbell bench press",
    "primary_muscle": "chest",
    "secondary_muscles": [
      "shoulders_front",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Shoulder blades retracted and down, slight arch. Bar to mid-chest, elbows tucked ~75 deg, drive feet into floor.",
    "rest_seconds": 180
  },
  {
    "key": "flat_db_press",
    "name": "Flat dumbbell press",
    "primary_muscle": "chest",
    "secondary_muscles": [
      "shoulders_front",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Deeper stretch than barbell. Lower under control, press without clanking dumbbells together.",
    "rest_seconds": 150
  },
  {
    "key": "machine_chest_press",
    "name": "Machine chest press",
    "primary_muscle": "chest",
    "secondary_muscles": [
      "shoulders_front",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Seat height so handles are at mid-chest. Full stretch, controlled press, don't lock out hard.",
    "rest_seconds": 120
  },
  {
    "key": "pec_deck",
    "name": "Pec deck / cable fly",
    "primary_muscle": "chest",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 15,
    "execution_cue": "Slight elbow bend held constant. Squeeze chest at midline, big stretch at the back. No arm pressing.",
    "rest_seconds": 90
  },
  {
    "key": "weighted_dip",
    "name": "Weighted dip (chest lean)",
    "primary_muscle": "chest",
    "secondary_muscles": [
      "triceps",
      "shoulders_front"
    ],
    "movement_type": "compound",
    "equipment": "bodyweight",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Lean torso forward, flare elbows slightly, descend to deep stretch, press up. Add weight via belt.",
    "rest_seconds": 150
  },
  {
    "key": "weighted_pullup",
    "name": "Weighted pull-up",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear"
    ],
    "movement_type": "compound",
    "equipment": "bodyweight",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Full hang, pull elbows down and back, chest to bar, control the descent. Add weight via belt.",
    "rest_seconds": 180
  },
  {
    "key": "lat_pulldown",
    "name": "Lat pulldown",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear"
    ],
    "movement_type": "compound",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Slight lean back, pull bar to upper chest, drive elbows down, control back up to full stretch.",
    "rest_seconds": 120
  },
  {
    "key": "chest_supported_row",
    "name": "Chest-supported row",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear"
    ],
    "movement_type": "compound",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Chest stays on pad. Row to lower ribs, squeeze shoulder blades, full stretch forward. No torso swing.",
    "rest_seconds": 120
  },
  {
    "key": "barbell_row",
    "name": "Barbell row",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear",
      "hamstrings"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 10,
    "execution_cue": "Hinge ~45 deg, flat back, pull bar to lower stomach, control down. Keep core braced.",
    "rest_seconds": 150
  },
  {
    "key": "tbar_row",
    "name": "T-bar row",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear"
    ],
    "movement_type": "compound",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Flat back, drive elbows back, squeeze at top, full stretch. Chest up throughout.",
    "rest_seconds": 150
  },
  {
    "key": "single_arm_db_row",
    "name": "Single-arm dumbbell row",
    "primary_muscle": "back",
    "secondary_muscles": [
      "biceps",
      "shoulders_rear"
    ],
    "movement_type": "compound",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Hand and knee on bench, flat back. Row to hip, full stretch at bottom, no twisting.",
    "rest_seconds": 90
  },
  {
    "key": "straight_arm_pulldown",
    "name": "Straight-arm pulldown",
    "primary_muscle": "back",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 15,
    "execution_cue": "Arms nearly straight, hinge slightly. Pull bar to thighs using lats, control back up.",
    "rest_seconds": 90
  },
  {
    "key": "overhead_press_bb",
    "name": "Overhead press (barbell)",
    "primary_muscle": "shoulders_front",
    "secondary_muscles": [
      "shoulders_side",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Brace hard, bar from front delts, press overhead and move head through. Lock out, control down.",
    "rest_seconds": 180
  },
  {
    "key": "seated_db_shoulder_press",
    "name": "Seated dumbbell shoulder press",
    "primary_muscle": "shoulders_front",
    "secondary_muscles": [
      "shoulders_side",
      "triceps"
    ],
    "movement_type": "compound",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Back supported, press from ear height to overhead, full stretch at bottom, no clanking.",
    "rest_seconds": 150
  },
  {
    "key": "db_lateral_raise",
    "name": "Dumbbell lateral raise",
    "primary_muscle": "shoulders_side",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Slight forward lean, lead with elbows, raise to shoulder height, control down. Light weight, no swing.",
    "rest_seconds": 75
  },
  {
    "key": "cable_lateral_raise",
    "name": "Cable lateral raise",
    "primary_muscle": "shoulders_side",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": true,
    "default_rep_low": 12,
    "default_rep_high": 18,
    "execution_cue": "Cable behind body for constant tension. Raise to shoulder height, slow return. Best lateral variation.",
    "rest_seconds": 75
  },
  {
    "key": "machine_lateral_raise",
    "name": "Machine lateral raise",
    "primary_muscle": "shoulders_side",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Pads on outer forearms, push out and up to shoulder height, control down. No momentum.",
    "rest_seconds": 75
  },
  {
    "key": "rear_delt_cable_fly",
    "name": "Rear delt cable fly",
    "primary_muscle": "shoulders_rear",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": true,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Cross cables, pull out and back leading with the elbow/pinky, squeeze rear delt, slow return.",
    "rest_seconds": 75
  },
  {
    "key": "reverse_pec_deck",
    "name": "Reverse pec deck",
    "primary_muscle": "shoulders_rear",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Slight elbow bend, pull handles out and back, squeeze shoulder blades, control return.",
    "rest_seconds": 75
  },
  {
    "key": "face_pull",
    "name": "Face pull",
    "primary_muscle": "shoulders_rear",
    "secondary_muscles": [
      "back"
    ],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 12,
    "default_rep_high": 20,
    "execution_cue": "Rope at face height, pull to forehead, externally rotate (knuckles back), squeeze, control.",
    "rest_seconds": 75
  },
  {
    "key": "db_curl",
    "name": "Dumbbell curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Elbows pinned at sides, curl without swinging, full squeeze, 2-3s lower to full extension.",
    "rest_seconds": 90
  },
  {
    "key": "incline_db_curl",
    "name": "Incline dumbbell curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Bench ~45-60 deg, arms hang back for max long-head stretch. Curl, squeeze, slow controlled negative.",
    "rest_seconds": 90
  },
  {
    "key": "hammer_curl",
    "name": "Hammer curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Neutral grip (thumbs up). Hits brachialis + brachioradialis. No swing, control the negative.",
    "rest_seconds": 90
  },
  {
    "key": "cable_curl",
    "name": "Cable curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Constant tension through the range. Elbows fixed, full squeeze, slow eccentric, full stretch.",
    "rest_seconds": 75
  },
  {
    "key": "preacher_curl",
    "name": "Preacher curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Upper arms flat on pad. Strong stretch at bottom (don't fully lock under load), squeeze top.",
    "rest_seconds": 90
  },
  {
    "key": "barbell_curl",
    "name": "Barbell / EZ-bar curl",
    "primary_muscle": "biceps",
    "secondary_muscles": [
      "forearms"
    ],
    "movement_type": "isolation",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Elbows at sides, curl without leaning back, squeeze, control down to full extension.",
    "rest_seconds": 90
  },
  {
    "key": "triceps_pushdown",
    "name": "Triceps pushdown",
    "primary_muscle": "triceps",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Elbows pinned to sides, extend fully, squeeze, control back to ~90 deg. No shoulder/torso help.",
    "rest_seconds": 75
  },
  {
    "key": "overhead_cable_ext",
    "name": "Overhead cable extension",
    "primary_muscle": "triceps",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Face away from stack, rope overhead, big stretch behind head, extend fully. Best long-head stretch.",
    "rest_seconds": 90
  },
  {
    "key": "skullcrusher",
    "name": "Skull crusher (EZ-bar)",
    "primary_muscle": "triceps",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Lower bar to forehead/just behind, elbows fairly fixed, extend. Control the stretch.",
    "rest_seconds": 90
  },
  {
    "key": "close_grip_bench",
    "name": "Close-grip bench press",
    "primary_muscle": "triceps",
    "secondary_muscles": [
      "chest",
      "shoulders_front"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Hands shoulder-width, elbows tucked, bar to lower chest, press emphasizing triceps lockout.",
    "rest_seconds": 150
  },
  {
    "key": "back_squat",
    "name": "Back squat",
    "primary_muscle": "quads",
    "secondary_muscles": [
      "glutes",
      "hamstrings"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 6,
    "default_rep_high": 10,
    "execution_cue": "Brace, break at hips and knees together, descend to at-least-parallel, drive up through midfoot.",
    "rest_seconds": 180
  },
  {
    "key": "hack_squat",
    "name": "Hack squat",
    "primary_muscle": "quads",
    "secondary_muscles": [
      "glutes"
    ],
    "movement_type": "compound",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Feet lower/closer for quad bias. Deep controlled descent, drive up without locking hard.",
    "rest_seconds": 150
  },
  {
    "key": "leg_press",
    "name": "Leg press",
    "primary_muscle": "quads",
    "secondary_muscles": [
      "glutes",
      "hamstrings"
    ],
    "movement_type": "compound",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Feet mid-platform, lower to deep knee bend without lower back rounding, press through heels.",
    "rest_seconds": 150
  },
  {
    "key": "bulgarian_split_squat",
    "name": "Bulgarian split squat",
    "primary_muscle": "quads",
    "secondary_muscles": [
      "glutes",
      "hamstrings"
    ],
    "movement_type": "compound",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 8,
    "default_rep_high": 12,
    "execution_cue": "Rear foot elevated, drop straight down on front leg, drive through front heel. Stay upright for quads.",
    "rest_seconds": 120
  },
  {
    "key": "leg_extension",
    "name": "Leg extension",
    "primary_muscle": "quads",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Extend to near-lockout, squeeze quads hard, control down. Pause at top for extra stimulus.",
    "rest_seconds": 90
  },
  {
    "key": "romanian_deadlift",
    "name": "Romanian deadlift",
    "primary_muscle": "hamstrings",
    "secondary_muscles": [
      "glutes",
      "back"
    ],
    "movement_type": "compound",
    "equipment": "barbell",
    "is_unilateral": false,
    "default_rep_low": 8,
    "default_rep_high": 10,
    "execution_cue": "Soft knees, push hips back, bar close to legs, feel hamstring stretch, drive hips forward to stand.",
    "rest_seconds": 150
  },
  {
    "key": "seated_leg_curl",
    "name": "Seated leg curl",
    "primary_muscle": "hamstrings",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Curl heels under, squeeze hamstrings, control the return. Seated bias stretches hams more.",
    "rest_seconds": 90
  },
  {
    "key": "lying_leg_curl",
    "name": "Lying leg curl",
    "primary_muscle": "hamstrings",
    "secondary_muscles": [
      "calves"
    ],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 12,
    "execution_cue": "Hips down on pad, curl fully, squeeze, slow controlled negative. Don't let hips rise.",
    "rest_seconds": 90
  },
  {
    "key": "standing_calf_raise",
    "name": "Standing calf raise",
    "primary_muscle": "calves",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 15,
    "execution_cue": "Full stretch at bottom (heel below step), explosive up, 1-2s pause at top stretch. No bouncing.",
    "rest_seconds": 75
  },
  {
    "key": "seated_calf_raise",
    "name": "Seated calf raise",
    "primary_muscle": "calves",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "machine",
    "is_unilateral": false,
    "default_rep_low": 12,
    "default_rep_high": 20,
    "execution_cue": "Bent knee targets soleus. Deep stretch, full contraction, controlled tempo.",
    "rest_seconds": 60
  },
  {
    "key": "hanging_leg_raise",
    "name": "Hanging leg raise",
    "primary_muscle": "abs",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "bodyweight",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 15,
    "execution_cue": "Posterior pelvic tilt, raise legs by curling pelvis up, control down. Don't swing.",
    "rest_seconds": 60
  },
  {
    "key": "cable_crunch",
    "name": "Cable crunch",
    "primary_muscle": "abs",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "cable",
    "is_unilateral": false,
    "default_rep_low": 10,
    "default_rep_high": 15,
    "execution_cue": "Kneel, rope by head, crunch by flexing spine (not hips), squeeze abs, control back up.",
    "rest_seconds": 60
  },
  {
    "key": "wrist_curl",
    "name": "Wrist curl",
    "primary_muscle": "forearms",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 12,
    "default_rep_high": 15,
    "execution_cue": "Forearms on thighs, curl wrists up, full range, control down. High reps work best.",
    "rest_seconds": 60
  },
  {
    "key": "reverse_wrist_curl",
    "name": "Reverse wrist curl",
    "primary_muscle": "forearms",
    "secondary_muscles": [],
    "movement_type": "isolation",
    "equipment": "dumbbell",
    "is_unilateral": true,
    "default_rep_low": 12,
    "default_rep_high": 20,
    "execution_cue": "Palms down, extend wrists up, control down. Lighter than wrist curls; trains extensors.",
    "rest_seconds": 60
  }
]$catalog$::jsonb) AS exercise(
    key TEXT,
    name TEXT,
    primary_muscle TEXT,
    secondary_muscles JSONB,
    movement_type TEXT,
    equipment TEXT,
    is_unilateral BOOLEAN,
    default_rep_low INT,
    default_rep_high INT,
    execution_cue TEXT,
    rest_seconds INT
  )
)
INSERT INTO gym_exercises (
  user_id, key, name, primary_muscle, secondary_muscles, movement_type, equipment,
  is_unilateral, default_rep_low, default_rep_high, execution_cue, rest_seconds
)
SELECT
  NULL,
  key,
  name,
  primary_muscle,
  ARRAY(SELECT jsonb_array_elements_text(secondary_muscles)),
  movement_type,
  equipment,
  COALESCE(is_unilateral, false),
  default_rep_low,
  default_rep_high,
  execution_cue,
  rest_seconds
FROM catalog
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gym_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  base_template TEXT NOT NULL DEFAULT 'upper_lower_upper_3day',
  specialization_muscle TEXT,
  spec_started_on DATE,
  unit_preference TEXT DEFAULT 'kg' CHECK (unit_preference IN ('kg', 'lb')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  started_at DATE DEFAULT CURRENT_DATE,
  deload_interval_weeks INT DEFAULT 7 CHECK (deload_interval_weeks > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_programs_user_status ON gym_programs(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_programs_one_active ON gym_programs(user_id) WHERE status = 'active';
ALTER TABLE gym_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym programs" ON gym_programs;
CREATE POLICY "Users own gym programs" ON gym_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS gym_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES gym_programs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  day_order INT NOT NULL CHECK (day_order > 0),
  default_weekday INT CHECK (default_weekday BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, day_order)
);
CREATE INDEX IF NOT EXISTS idx_gym_program_days_program ON gym_program_days(program_id, day_order);
ALTER TABLE gym_program_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym program days" ON gym_program_days;
CREATE POLICY "Users own gym program days" ON gym_program_days FOR ALL USING (
  EXISTS (SELECT 1 FROM gym_programs p WHERE p.id = gym_program_days.program_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM gym_programs p WHERE p.id = gym_program_days.program_id AND p.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS gym_program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID REFERENCES gym_program_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES gym_exercises(id) ON DELETE RESTRICT NOT NULL,
  slot_order INT NOT NULL CHECK (slot_order > 0),
  target_sets INT NOT NULL CHECK (target_sets > 0),
  target_rep_low INT NOT NULL CHECK (target_rep_low > 0),
  target_rep_high INT NOT NULL CHECK (target_rep_high >= target_rep_low),
  is_specialization BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_day_id, slot_order)
);
CREATE INDEX IF NOT EXISTS idx_gym_program_exercises_day_order ON gym_program_exercises(program_day_id, slot_order);
ALTER TABLE gym_program_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym program exercises" ON gym_program_exercises;
CREATE POLICY "Users own gym program exercises" ON gym_program_exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gym_program_days d
    JOIN gym_programs p ON p.id = d.program_id
    WHERE d.id = gym_program_exercises.program_day_id AND p.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM gym_program_days d
    JOIN gym_programs p ON p.id = d.program_id
    WHERE d.id = gym_program_exercises.program_day_id AND p.user_id = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS gym_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES gym_programs(id) ON DELETE SET NULL,
  program_day_id UUID REFERENCES gym_program_days(id) ON DELETE SET NULL,
  focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  bodyweight_kg NUMERIC(7,2),
  duration_min INT,
  is_deload BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gym_sessions ADD COLUMN IF NOT EXISTS focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_date ON gym_sessions(user_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_program ON gym_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_program_day ON gym_sessions(program_day_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_focus_session ON gym_sessions(focus_session_id);
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym sessions" ON gym_sessions;
CREATE POLICY "Users own gym sessions" ON gym_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS gym_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES gym_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES gym_exercises(id) ON DELETE RESTRICT NOT NULL,
  set_number INT NOT NULL CHECK (set_number > 0),
  weight_kg NUMERIC(8,2) CHECK (weight_kg >= 0),
  reps INT CHECK (reps > 0),
  rir INT CHECK (rir BETWEEN 0 AND 5),
  is_warmup BOOLEAN DEFAULT false,
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, exercise_id, set_number)
);
CREATE INDEX IF NOT EXISTS idx_gym_set_logs_session ON gym_set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_gym_set_logs_exercise_created ON gym_set_logs(exercise_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gym_set_logs_exercise_logged ON gym_set_logs(exercise_id, logged_at);
ALTER TABLE gym_set_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym set logs" ON gym_set_logs;
CREATE POLICY "Users own gym set logs" ON gym_set_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM gym_sessions s WHERE s.id = gym_set_logs.session_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM gym_sessions s WHERE s.id = gym_set_logs.session_id AND s.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS gym_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES gym_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES gym_exercises(id) ON DELETE RESTRICT NOT NULL,
  estimated_1rm NUMERIC(8,2) NOT NULL CHECK (estimated_1rm >= 0),
  weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg >= 0),
  reps INT NOT NULL CHECK (reps > 0),
  achieved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS idx_gym_prs_user_date ON gym_prs(user_id, achieved_at);
CREATE INDEX IF NOT EXISTS idx_gym_prs_exercise ON gym_prs(exercise_id, estimated_1rm DESC);
ALTER TABLE gym_prs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own gym prs" ON gym_prs;
CREATE POLICY "Users own gym prs" ON gym_prs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION gym_specialization_cap(target_muscle TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE target_muscle
    WHEN 'biceps' THEN 22
    WHEN 'triceps' THEN 18
    WHEN 'chest' THEN 20
    WHEN 'back' THEN 24
    WHEN 'shoulders_side' THEN 26
    WHEN 'shoulders_rear' THEN 22
    WHEN 'quads' THEN 20
    WHEN 'hamstrings' THEN 18
    WHEN 'calves' THEN 18
    WHEN 'abs' THEN 20
    WHEN 'forearms' THEN 16
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION rpc_apply_gym_program(target_program_id UUID, target_specialization_muscle TEXT, generated_days JSONB)
RETURNS VOID AS $$
DECLARE
  requester UUID := auth.uid();
  program_owner UUID;
  day_payload JSONB;
  slot_payload JSONB;
  inserted_day_id UUID;
  exercise_row_id UUID;
  cap_sets INT;
  target_sets INT;
BEGIN
  IF requester IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT user_id INTO program_owner FROM gym_programs WHERE id = target_program_id FOR UPDATE;
  IF program_owner IS NULL OR program_owner <> requester THEN
    RAISE EXCEPTION 'program_not_found';
  END IF;

  cap_sets := gym_specialization_cap(NULLIF(target_specialization_muscle, ''));

  DELETE FROM gym_program_exercises
  WHERE program_day_id IN (SELECT id FROM gym_program_days WHERE program_id = target_program_id);
  DELETE FROM gym_program_days WHERE program_id = target_program_id;

  FOR day_payload IN SELECT * FROM jsonb_array_elements(generated_days)
  LOOP
    INSERT INTO gym_program_days (program_id, label, day_order, default_weekday)
    VALUES (
      target_program_id,
      day_payload->>'label',
      (day_payload->>'day_order')::INT,
      NULLIF(day_payload->>'default_weekday', '')::INT
    )
    RETURNING id INTO inserted_day_id;

    FOR slot_payload IN SELECT * FROM jsonb_array_elements(day_payload->'slots')
    LOOP
      SELECT id INTO exercise_row_id
      FROM gym_exercises
      WHERE (id::TEXT = slot_payload->>'exercise_id' OR key = slot_payload->>'exercise_key')
        AND (user_id IS NULL OR user_id = requester)
      ORDER BY user_id NULLS FIRST
      LIMIT 1;

      IF exercise_row_id IS NULL THEN
        RAISE EXCEPTION 'exercise_not_found:%', slot_payload->>'exercise_key';
      END IF;

      INSERT INTO gym_program_exercises (
        program_day_id, exercise_id, slot_order, target_sets, target_rep_low, target_rep_high, is_specialization, notes
      ) VALUES (
        inserted_day_id,
        exercise_row_id,
        (slot_payload->>'slot_order')::INT,
        (slot_payload->>'sets')::INT,
        (slot_payload->>'rep_low')::INT,
        (slot_payload->>'rep_high')::INT,
        COALESCE((slot_payload->>'is_specialization')::BOOLEAN, false),
        NULLIF(slot_payload->>'notes', '')
      );
    END LOOP;
  END LOOP;

  IF cap_sets IS NOT NULL THEN
    SELECT COALESCE(SUM(pe.target_sets), 0)::INT INTO target_sets
    FROM gym_program_exercises pe
    JOIN gym_program_days pd ON pd.id = pe.program_day_id
    JOIN gym_exercises ex ON ex.id = pe.exercise_id
    WHERE pd.program_id = target_program_id
      AND ex.primary_muscle = target_specialization_muscle;

    IF target_sets > cap_sets THEN
      RAISE EXCEPTION 'weekly_cap_exceeded:%/%', target_sets, cap_sets;
    END IF;
  END IF;

  UPDATE gym_programs
  SET specialization_muscle = NULLIF(target_specialization_muscle, ''),
      spec_started_on = CASE WHEN NULLIF(target_specialization_muscle, '') IS NULL THEN NULL ELSE CURRENT_DATE END,
      updated_at = now()
  WHERE id = target_program_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rpc_finish_gym_session(target_session_id UUID, target_duration_min INT)
RETURNS JSONB AS $$
DECLARE
  requester UUID := auth.uid();
  session_row gym_sessions%ROWTYPE;
  day_label TEXT;
  habit_row_id UUID;
  focus_row_id UUID;
  finish_minutes INT;
  pr_deltas JSONB := '[]'::jsonb;
BEGIN
  IF requester IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO session_row FROM gym_sessions WHERE id = target_session_id FOR UPDATE;
  IF session_row.id IS NULL OR session_row.user_id <> requester THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  finish_minutes := GREATEST(1, COALESCE(target_duration_min, session_row.duration_min, 1));

  UPDATE gym_sessions
  SET duration_min = finish_minutes, updated_at = now()
  WHERE id = target_session_id
  RETURNING * INTO session_row;

  IF session_row.focus_session_id IS NULL THEN
    INSERT INTO focus_sessions (user_id, task_id, project_id, date, duration_minutes, total_duration_minutes)
    VALUES (requester, NULL, NULL, session_row.performed_at, finish_minutes, finish_minutes)
    RETURNING id INTO focus_row_id;

    UPDATE gym_sessions
    SET focus_session_id = focus_row_id, updated_at = now()
    WHERE id = target_session_id
    RETURNING * INTO session_row;
  ELSE
    UPDATE focus_sessions
    SET date = session_row.performed_at,
        duration_minutes = finish_minutes,
        total_duration_minutes = finish_minutes
    WHERE id = session_row.focus_session_id AND user_id = requester
    RETURNING id INTO focus_row_id;
  END IF;

  SELECT label INTO day_label FROM gym_program_days WHERE id = session_row.program_day_id;
  IF day_label IS NOT NULL THEN
    SELECT id INTO habit_row_id
    FROM habits
    WHERE user_id = requester AND title = ('Train - ' || day_label) AND is_active = true
    LIMIT 1;

    IF habit_row_id IS NOT NULL THEN
      INSERT INTO habit_logs (user_id, habit_id, date, completed)
      VALUES (requester, habit_row_id, session_row.performed_at, true)
      ON CONFLICT (habit_id, date) DO UPDATE SET completed = EXCLUDED.completed;
    END IF;
  END IF;

  WITH ranked_current AS (
    SELECT
      gl.exercise_id,
      gl.weight_kg,
      gl.reps,
      (gl.weight_kg * (1 + (gl.reps::NUMERIC / 30.0))) AS estimated_1rm,
      ROW_NUMBER() OVER (
        PARTITION BY gl.exercise_id
        ORDER BY (gl.weight_kg * (1 + (gl.reps::NUMERIC / 30.0))) DESC, gl.weight_kg DESC, gl.reps DESC
      ) AS set_rank
    FROM gym_set_logs gl
    WHERE gl.session_id = session_row.id
      AND gl.is_warmup = false
      AND gl.weight_kg IS NOT NULL
      AND gl.reps IS NOT NULL
  ),
  previous_best AS (
    SELECT
      gl.exercise_id,
      MAX(gl.weight_kg * (1 + (gl.reps::NUMERIC / 30.0))) AS estimated_1rm
    FROM gym_set_logs gl
    JOIN gym_sessions s ON s.id = gl.session_id
    WHERE s.user_id = requester
      AND gl.session_id <> session_row.id
      AND gl.is_warmup = false
      AND gl.weight_kg IS NOT NULL
      AND gl.reps IS NOT NULL
    GROUP BY gl.exercise_id
  ),
  inserted_prs AS (
    INSERT INTO gym_prs (user_id, session_id, exercise_id, estimated_1rm, weight_kg, reps, achieved_at)
    SELECT
      requester,
      session_row.id,
      current_set.exercise_id,
      ROUND(current_set.estimated_1rm, 2),
      current_set.weight_kg,
      current_set.reps,
      session_row.performed_at
    FROM ranked_current current_set
    LEFT JOIN previous_best previous ON previous.exercise_id = current_set.exercise_id
    WHERE current_set.set_rank = 1
      AND current_set.estimated_1rm > COALESCE(previous.estimated_1rm, 0)
    ON CONFLICT (session_id, exercise_id) DO UPDATE
      SET estimated_1rm = EXCLUDED.estimated_1rm,
          weight_kg = EXCLUDED.weight_kg,
          reps = EXCLUDED.reps,
          achieved_at = EXCLUDED.achieved_at
      WHERE EXCLUDED.estimated_1rm > gym_prs.estimated_1rm
    RETURNING exercise_id, estimated_1rm, weight_kg, reps
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'exerciseId', exercise_id,
        'estimated1rm', estimated_1rm,
        'weightKg', weight_kg,
        'reps', reps
      )
    ),
    '[]'::jsonb
  )
  INTO pr_deltas
  FROM inserted_prs;

  RETURN jsonb_build_object(
    'sessionId', session_row.id,
    'durationMin', session_row.duration_min,
    'focusSessionId', session_row.focus_session_id,
    'habitMarked', habit_row_id IS NOT NULL,
    'prDeltas', pr_deltas
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rpc_apply_program(target_program_id UUID, target_specialization_muscle TEXT, generated_days JSONB)
RETURNS VOID AS $$
BEGIN
  PERFORM rpc_apply_gym_program(target_program_id, target_specialization_muscle, generated_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rpc_finish_session(target_session_id UUID, target_duration_min INT)
RETURNS JSONB AS $$
BEGIN
  RETURN rpc_finish_gym_session(target_session_id, target_duration_min);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
