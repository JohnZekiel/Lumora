import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type CircularTimerProps = {
  progress: number;
  timeText: string;
  modeText: string;
  isRunning: boolean;
};

const SIZE = 280;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularTimer({
  progress,
  timeText,
  modeText,
  isRunning,
}: CircularTimerProps) {
  const boundedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityLabel={`${modeText}, ${timeText}${isRunning ? ', running' : ', paused'}`}
      style={styles.container}
    >
      <Svg height={SIZE} width={SIZE} style={styles.ring}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#D5E3D9"
          strokeWidth={STROKE_WIDTH}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#4A7859"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - boundedProgress)}
          strokeLinecap="round"
          rotation={-90}
          originX={SIZE / 2}
          originY={SIZE / 2}
        />
      </Svg>
      <View style={styles.content}>
        <Text style={styles.mode}>{modeText}</Text>
        <Text style={styles.time}>{timeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F5',
    borderRadius: SIZE / 2,
  },
  ring: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  mode: {
    color: '#777',
    fontSize: 16,
    marginBottom: 8,
  },
  time: {
    color: '#2D2D2D',
    fontSize: 56,
    fontVariant: ['tabular-nums'],
  },
});
