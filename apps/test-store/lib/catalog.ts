export const virtualOrganization = { name: "Virtual Store", url: "https://example.com/virtual-store", description: "가상 상품과 공식 정보를 제공하는 로컬 테스트 전용 쇼핑몰입니다." };
export const virtualProducts = [
  { slug: "virtual-focus-kit", name: "Virtual Focus Kit", category: "가상 워크 키트", description: "집중 흐름을 정돈하는 상황을 검증하기 위한 가상 상품입니다.", price: 29000, currency: "KRW", availability: "https://schema.org/InStock", rating: 4.6, reviewCount: 28, image: "https://example.com/images/virtual-focus-kit.png", imageAlt: "Virtual Focus Kit 가상 상품 자리표시자" },
  { slug: "virtual-insight-set", name: "Virtual Insight Set", category: "가상 리서치 도구", description: "정보 비교 과정을 설명하기 위한 가상 상품 세트입니다.", price: 41000, currency: "KRW", availability: "https://schema.org/LimitedAvailability", rating: 4.4, reviewCount: 16, image: "https://example.com/images/virtual-insight-set.png", imageAlt: "Virtual Insight Set 가상 상품 자리표시자" },
] as const;
export const virtualFaq = [
  { question: "Virtual 상품은 실제로 구매할 수 있나요?", answer: "아니요. 모든 상품은 로컬 수집과 콘텐츠 생성 흐름을 확인하기 위한 가상 데이터입니다." },
  { question: "표시된 가격과 재고는 실제 정보인가요?", answer: "아니요. Product 구조화 데이터 추출과 검수 화면을 시험하기 위한 가상 값입니다." },
] as const;
