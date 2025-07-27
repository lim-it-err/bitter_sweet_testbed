# 6. 의존성 충돌 해결 전략
## 6.1 해결 전략 총론

| 전략                | 사용 기술                             | 언제 쓰는가                                 |
|---------------------|----------------------------------------|---------------------------------------------|
| **Exclusion**        | Maven `<exclusion>`, Gradle `exclude` | 특정 트랜지티브 의존성을 제거               |
| **Version Forcing**  | Maven `dependencyManagement`, Gradle `force` | 중복된 라이브러리 버전 강제 고정     |
| **Dependency Lock**  | Lock file 기반 고정                    | 빌드 재현성 확보                             |
| **BOM (BoM)**        | 버전 통합 관리                         | 여러 모듈 간 공통 의존성 관리               |
| **Relocation**       | Shadow plugin                          | Fat JAR 충돌 방지                           |
| **Tooling**          | Graph/Tree 도구                        | 충돌, 보안 위험 시각적 탐지                |

---

### 6.2 Exclusion

**Maven**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
  <exclusions>
    <exclusion>
      <groupId>commons-logging</groupId>
      <artifactId>commons-logging</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```
```implementation('org.springframework.boot:spring-boot-starter-web') {
exclude group: 'commons-logging', module: 'commons-logging'
}

```
### 6.3 Version Forcing
```<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.apache.commons</groupId>
      <artifactId>commons-lang3</artifactId>
      <version>3.12.0</version>
    </dependency>
  </dependencies>
</dependencyManagement>```

```configurations.all {
    resolutionStrategy {
        force 'org.apache.commons:commons-lang3:3.12.0'
    }
}```

### 6.4  Dependency Lock
```
./gradlew dependencies --write-locks
```
- Gradle
    - dependencies.lock 파일 생성 → 모든 의존성 버전 고정

- Maven
    기본 기능 없음. → Takari Plugin 사용
```

이외에도 BOM, Relocation 등이 있음