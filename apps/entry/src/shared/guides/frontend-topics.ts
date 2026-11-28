const topics = [
  {
    id: "provider",
    excerpts: [["### 의존성 주입과 제어 역전", "### Props"]],
  },
  {
    id: "composition",
    excerpts: [
      ["#### Children 기반 레이아웃 합성", "### Props과 Provider 기반 의존성 주입 활용"],
    ],
  },
  {
    id: "naming",
    excerpts: [
      ["### 네이밍"],
      ["#### 이름이 겹치는 import의 별칭", "#### 용도로 구별하는 변수"],
    ],
  },
  {
    id: "fsd",
    excerpts: [
      ["### 모듈 & FSD", "#### 편집 상태를 중계하지 않는 Pages"],
      ["#### 다른 슬라이스가 사용하는 공개 진입점", "#### 자기 슬라이스의 진입점에서 발생한 순환 import"],
    ],
  },
] as const;

export function selectFrontendTopics(markdown: string) {
  const lines = markdown.split(/\r?\n/u);
  const headings = new Map<string, number>();
  let fence: string | undefined;

  for (const [index, line] of lines.entries()) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})/u.exec(line)?.[1];

    if (fence) {
      if (delimiter?.startsWith(fence) && line.trim() === delimiter) {
        fence = undefined;
      }
      continue;
    }

    if (delimiter) {
      fence = delimiter;
      continue;
    }

    if (/^#{1,6} /u.test(line)) {
      headings.set(line, index);
    }
  }

  return topics.map(({ id, excerpts }) => ({
    id,
    markdown: excerpts
      .map(([first, next]) => {
        const start = headings.get(first);
        if (start === undefined) {
          throw new Error(`Frontend guide excerpt not found: ${first}`);
        }

        const nextTopic = [...headings].find(
          ([heading, index]) => index > start && /^#{1,3} /u.test(heading),
        );
        const end = next ? headings.get(next) : (nextTopic?.[1] ?? lines.length);

        if (end === undefined || end <= start) {
          throw new Error(`Frontend guide excerpt end not found: ${next}`);
        }

        const startAt = first.startsWith("### ") ? start + 1 : start;

        return lines
          .slice(startAt, end)
          .map((line, index) =>
            headings.get(line) === startAt + index ? line.slice(1) : line,
          )
          .join("\n")
          .trim();
      })
      .join("\n\n"),
  }));
}
