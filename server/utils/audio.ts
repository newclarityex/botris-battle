import { Howl, Howler } from 'howler';

Howler.volume(0.2);

export const AUDIO_SOURCES = {
    'tank_garbage': new Howl({
        src: ['/audio/tank_garbage.mp3'],
    }),
    'place_piece': new Howl({
        src: ['/audio/place_piece.mp3'],
    }),
    'all_clear': new Howl({
        src: ['/audio/all_clear.mp3'],
    }),
    'all_spin_clear': new Howl({
        src: ['/audio/all_spin_clear.mp3'],
    }),
    'line_clear': new Howl({
        src: ['/audio/line_clear.mp3'],
    }),
    'combo': [
        new Howl({
            src: ['/audio/combo/combo_1.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_2.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_3.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_4.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_5.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_6.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_7.mp3'],
        }),
        new Howl({
            src: ['/audio/combo/combo_8.mp3'],
        }),
    ]
}