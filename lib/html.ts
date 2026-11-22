import sanitizeHtml from "sanitize-html";

const localImage = /^\/media\/[a-f0-9]{32}$/;
const remoteImage = /^https?:\/\/[^\s"'<>]+$/i;

export function allowedImageSrc(src: string) {
  return localImage.test(src) || remoteImage.test(src);
}

export function renderRichText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ["a", "span", "b", "i", "em", "strong", "br", "p", "ul", "ol", "li", "u", "code", "img"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "loading", "decoding", "referrerpolicy"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    exclusiveFilter(frame) {
      return frame.tag === "img" && !allowedImageSrc(frame.attribs.src ?? "");
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
      img(_tagName, attribs) {
        return {
          tagName: "img",
          attribs: {
            src: attribs.src,
            alt: (attribs.alt ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
            loading: "lazy",
            decoding: "async",
            referrerpolicy: "no-referrer",
          },
        };
      },
    },
  });
}
