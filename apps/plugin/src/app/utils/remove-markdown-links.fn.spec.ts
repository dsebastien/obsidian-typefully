import { removeMarkdownLinks } from './remove-markdown-links.fn';

describe('removeMarkdownLinks', () => {
  it('should not change anything if the text does not include markdown links', () => {
    const value = 'Hello world';
    expect(removeMarkdownLinks(value)).toEqual(value);
  });

  it('should remove markdown links', () => {
    const textWithLinks =
      'Die **Sacherschließung** ([engl.](https://de.wikipedia.org/wiki/Englische_Sprache) *subject cataloguing*) oder **Inhaltserschließung** bezeichnet innerhalb der [Bibliotheks-](https://de.wikipedia.org/wiki/Bibliothekswissenschaft) und [Dokumentationswissenschaft](https://de.wikipedia.org/wiki/Dokumentationswissenschaft) die Erschließung bibliographischer und archivalischer Ressourcen nach inhaltlichen Kriterien. Das bedeutet, dass eine Ressource intellektuell oder automatisch aufgrund ihres Inhalts beschrieben wird. Im Gegensatz dazu widmet sich die [Formalerschließung](https://de.wikipedia.org/wiki/Formalerschlie%C3%9Fung), die auch als Katalogisierung bezeichnet wird, der Erfassung eines Objekts nach formalen Regeln. Hierbei werden nur Daten herangezogen, die sich unmittelbar ermitteln lassen, z. B. der Titel eines Werkes.';
    const textWithoutLinks =
      'Die **Sacherschließung** (engl. *subject cataloguing*) oder **Inhaltserschließung** bezeichnet innerhalb der Bibliotheks- und Dokumentationswissenschaft die Erschließung bibliographischer und archivalischer Ressourcen nach inhaltlichen Kriterien. Das bedeutet, dass eine Ressource intellektuell oder automatisch aufgrund ihres Inhalts beschrieben wird. Im Gegensatz dazu widmet sich die Formalerschließung, die auch als Katalogisierung bezeichnet wird, der Erfassung eines Objekts nach formalen Regeln. Hierbei werden nur Daten herangezogen, die sich unmittelbar ermitteln lassen, z. B. der Titel eines Werkes.';

    expect(removeMarkdownLinks(textWithLinks)).toEqual(textWithoutLinks);
  });
});
