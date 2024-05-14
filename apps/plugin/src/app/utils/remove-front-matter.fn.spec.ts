import { removeFrontMatter } from './remove-front-matter.fn';

describe('removeFrontMatter', () => {
  it('should not change anything if the text does not include front matter', () => {
    const value = 'Hello world';
    expect(removeFrontMatter(value)).toEqual(value);

    // FIXME known to break
    //     text = `Hello world
    //
    // ---
    // ohoh
    //
    // ---
    // `;
    //     expect(removeFrontMatter(text)).toEqual(text);
  });

  it('should remove front matter when present', () => {
    const frontMatter = '---\npublished: true\n---\n';
    const text = '## Test\nHello world\n';
    const value = `${frontMatter}${text}`;

    expect(removeFrontMatter(value)).toEqual(text);
  });
});
