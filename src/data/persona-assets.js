/* Originele illustraties van fictieve personen; volledig ingebed, zonder externe beeldbronnen. */
(() => {
  const people = {
    personHr: { bg: "#F7DCEB", skin: "#E6AD89", shade: "#C88565", hair: "#714537", style: "bob", shirt: "#343D67", blouse: "#FFF1E7" },
    personFinance: { bg: "#DBEAF8", skin: "#E9B897", shade: "#C78F71", hair: "#685345", style: "short", shirt: "#375D82", blouse: "#E5F0FA" },
    personProject: { bg: "#EAE0F7", skin: "#B77756", shade: "#92583E", hair: "#352D36", style: "curly", shirt: "#805578", blouse: "#FCE8E0" },
    personSecurity: { bg: "#DDE9EF", skin: "#C99471", shade: "#A16C50", hair: "#34313B", style: "beard", shirt: "#314B63", blouse: "#D9E7ED" },
    personCare: { bg: "#D8F0EB", skin: "#F0C3A4", shade: "#CD977B", hair: "#967047", style: "ponytail", shirt: "#287F80", blouse: "#B4E3DA" },
    personSpecialist: { bg: "#E2E9F7", skin: "#A86C4C", shade: "#824D36", hair: "#41404A", style: "doctor", shirt: "#F7FAFF", blouse: "#567BA5" },
  };
  const portrait = (p) => {
    const medical = p.style === "ponytail" || p.style === "doctor";
    const curls = [[85, 72], [103, 55], [127, 50], [151, 56], [171, 75], [177, 100], [176, 127], [169, 150], [86, 150], [78, 124], [78, 97]];
    const back = p.style === "curly"
      ? `<g fill="${p.hair}">${curls.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="19"/>`).join("")}</g>`
      : p.style === "bob"
        ? `<path d="M75 100Q70 46 125 43Q181 43 181 103L188 181Q162 194 147 179H106Q87 196 68 180Z" fill="${p.hair}"/>`
        : p.style === "ponytail"
          ? `<path d="M161 92Q200 88 196 129Q192 156 174 180Q183 141 159 131Z" fill="${p.hair}"/>`
          : "";
    const front = p.style === "curly"
      ? `<path d="M84 105V86Q88 54 126 55Q162 51 171 86V110L159 87Q147 95 138 77Q118 95 105 79L95 105Z" fill="${p.hair}"/>`
      : p.style === "ponytail"
        ? `<path d="M82 112L80 85Q80 48 124 47Q169 46 176 85L174 117L164 101L160 82Q120 97 94 82L93 105Z" fill="${p.hair}"/>`
        : `<path d="M82 113L79 87Q77 48 117 45Q155 38 171 67Q182 81 173 116L164 101L160 78Q133 92 103 77L94 91L93 108Z" fill="${p.hair}"/>
           <path d="M95 70Q118 53 145 61" fill="none" stroke="#FFFFFF" stroke-opacity=".14" stroke-width="5" stroke-linecap="round"/>`;
    const collar = medical
      ? p.style === "doctor"
        ? `<path d="M106 176L128 227L150 176L165 189L148 204L154 217L131 248H125L102 217L108 204L91 189Z" fill="#FFFFFF" stroke="#CBD6E5" stroke-width="2"/>
           <path d="M110 181V207Q110 224 127 224Q144 224 144 207V182" fill="none" stroke="#324960" stroke-width="4" stroke-linecap="round"/>
           <path d="M127 224V236H151V220" fill="none" stroke="#324960" stroke-width="4" stroke-linecap="round"/>
           <circle cx="151" cy="216" r="8" fill="#D5DFEC" stroke="#324960" stroke-width="3"/>`
        : `<path d="M105 176L128 199L151 176" fill="none" stroke="${p.blouse}" stroke-width="7" stroke-linejoin="round"/>
           <path d="M151 215H179V237H151Z" fill="#FFFFFF" fill-opacity=".12"/>`
      : p.style === "beard"
        ? `<path d="M105 178L128 194L151 178L146 199L128 190L110 199Z" fill="${p.blouse}"/>
           <path d="M128 196V256" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="2"/>
           <circle cx="133" cy="212" r="2" fill="#DAE4EA"/>`
        : `<path d="M104 175L128 195L152 175L144 238H112Z" fill="${p.blouse}"/>
           <path d="M99 177L117 207L107 221L91 187M157 177L139 207L149 221L165 187" fill="none" stroke="#FFFFFF" stroke-opacity=".24" stroke-width="3" stroke-linejoin="round"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs><clipPath id="round"><circle cx="128" cy="128" r="128"/></clipPath></defs>
      <g clip-path="url(#round)">
        <path fill="${p.bg}" d="M0 0H256V256H0Z"/>
        <circle cx="211" cy="42" r="86" fill="#FFFFFF" fill-opacity=".32"/>
        <circle cx="25" cy="242" r="84" fill="#FFFFFF" fill-opacity=".22"/>
        ${back}
        <path d="M42 256L50 214Q53 188 103 176H153Q202 188 206 214L214 256Z" fill="${p.shirt}"/>
        <path d="M112 144H144V180Q142 195 128 195Q114 195 112 180Z" fill="${p.skin}"/>
        <path d="M112 145H144V163Q128 175 112 164Z" fill="${p.shade}"/>
        ${collar}
        <ellipse cx="86" cy="112" rx="9" ry="13" fill="${p.skin}"/>
        <ellipse cx="170" cy="112" rx="9" ry="13" fill="${p.skin}"/>
        <path d="M86 94Q84 56 128 54Q172 56 170 94L167 127Q163 156 128 165Q94 156 89 127Z" fill="${p.skin}"/>
        <path d="M154 76Q171 109 155 139Q146 154 128 165Q163 156 167 127L170 94Q171 77 161 66Z" fill="${p.shade}" fill-opacity=".22"/>
        ${front}
        ${p.style === "doctor" ? '<path d="M84 93L92 91L95 119L88 124ZM164 91L173 94L168 124L161 117Z" fill="#AEB1BE"/>' : ""}
        ${p.style === "beard" ? `<path d="M91 120Q100 140 112 134Q128 128 144 134Q157 138 166 119L163 140Q154 159 128 165Q101 159 93 141Z" fill="${p.hair}" fill-opacity=".9"/>` : ""}
        <g fill="none" stroke="${p.hair}" stroke-width="3.5" stroke-linecap="round">
          <path d="M101 99Q109 95 117 98M139 98Q147 95 155 99"/>
        </g>
        <g fill="#343040"><ellipse cx="110" cy="110" rx="3.5" ry="4.5"/><ellipse cx="146" cy="110" rx="3.5" ry="4.5"/></g>
        <g fill="#FFFFFF"><circle cx="111" cy="109" r="1"/><circle cx="147" cy="109" r="1"/></g>
        <path d="M128 112L124 126Q128 129 132 126" fill="none" stroke="${p.shade}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M113 136Q128 143 143 136Q138 149 128 149Q118 149 113 136Z" fill="#FFFFFF"/>
        <path d="M113 136Q128 143 143 136" fill="none" stroke="${p.style === "beard" ? "#252630" : "#915744"}" stroke-width="2" stroke-linecap="round"/>
        ${p.style === "beard" ? '<g fill="none" stroke="#263B51" stroke-width="3"><rect x="96" y="101" width="27" height="20" rx="8"/><rect x="133" y="101" width="27" height="20" rx="8"/><path d="M123 109Q128 106 133 109M89 105L96 107M160 107L167 105"/></g>' : ""}
      </g>
    </svg>`;
  };
  for (const [key, person] of Object.entries(people)) BRAND_ASSETS[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(portrait(person));
})();
