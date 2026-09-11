import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/plugin.ts',
  output: {
    file: 'com.berniemack.voxbernie.sdPlugin/bin/plugin.js',
    format: 'cjs',
    sourcemap: false
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' })
  ],
  external: ['node:http']
};
