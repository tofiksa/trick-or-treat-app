import { describe, it, expect } from 'vitest';
import { buildPhotoFileName } from '../photoFileName';

describe('buildPhotoFileName', () => {
  it('builds flat geotagged name from worked example', () => {
    expect(
      buildPhotoFileName({
        userName: 'Anna',
        latitude: 59.9139,
        longitude: 10.7522,
        timestamp: 1730390400000,
        ext: 'jpg',
      }),
    ).toBe('anna_59.913900_10.752200_1730390400000.jpg');
  });

  it('sanitizes spaces, specials, and accents', () => {
    expect(
      buildPhotoFileName({
        userName: 'Åse Marie!',
        latitude: 60.39299,
        longitude: 5.32415,
        timestamp: 1000,
        ext: 'jpeg',
      }),
    ).toBe('ase_marie_60.392990_5.324150_1000.jpeg');
  });

  it('falls back to bruker for empty name', () => {
    expect(
      buildPhotoFileName({
        userName: '   ',
        latitude: 1,
        longitude: 2,
        timestamp: 3,
        ext: 'png',
      }),
    ).toBe('bruker_1.000000_2.000000_3.png');
  });

  it('strips leading dots from ext if present', () => {
    expect(
      buildPhotoFileName({
        userName: 'Josef',
        latitude: 0,
        longitude: 0,
        timestamp: 9,
        ext: '.jpg',
      }),
    ).toBe('josef_0.000000_0.000000_9.jpg');
  });
});
