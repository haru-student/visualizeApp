using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace visualizeApp.Services
{
    public class CodeAnalysis
    {
        public static int id = 0;
        public static List<int> preId = new List<int>();
        public static List<string> preType = new List<string>();
        public static int depth = 0;
        private static JsonExporter jsonHandler = new JsonExporter();
        static bool isElse = false;

        private static string currentClassName = "";
        private static string currentMethodName = "";

        public void Entry(string code)
        {
            SyntaxTree tree = CSharpSyntaxTree.ParseText(code);
            CompilationUnitSyntax root = tree.GetCompilationUnitRoot();

            foreach (var classDecl in root.Members.OfType<ClassDeclarationSyntax>())
            {
                currentClassName = classDecl.Identifier.Text;
                AnalyzeClass(classDecl);
            }

            jsonHandler.saveFile();
        }

        static void AnalyzeClass(ClassDeclarationSyntax classDecl)
        {
            foreach (var methodDecl in classDecl.Members.OfType<MethodDeclarationSyntax>())
            {
                currentMethodName = methodDecl.Identifier.Text;
                AnalyzeStatements(methodDecl.Body.Statements);
            }
        }

        static void AnalyzeStatements(SyntaxList<StatementSyntax> statements)
        {
            foreach (var statement in statements)
            {
                var lineSpan = statement.GetLocation().GetLineSpan();
                int lineNumber = lineSpan.StartLinePosition.Line + 1;
                if (statement is ExpressionStatementSyntax exprStmt)
                {
                    jsonHandler.addNode(id, "expression", exprStmt.Expression.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("expression");
                    SaveCondition("expression");
                    id++;
                }
                else if (statement is LocalDeclarationStatementSyntax localDeclStmt)
                {
                    jsonHandler.addNode(id, "localDeclaration", localDeclStmt.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("localDecl");
                    SaveCondition("localDecl");
                    id++;
                }
                else if (statement is IfStatementSyntax ifStmt)
                {
                    jsonHandler.addNode(id, "if", ifStmt.Condition.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("if");
                    SaveCondition("if");
                    if (isElse)
                    {
                        isElse = false;
                    }
                    id++;
                    int tmp = depth;
                    depth++;
                    AnalyzeStatements(ifStmt.Statement is BlockSyntax ifBlock
                        ? ifBlock.Statements
                        : SyntaxFactory.SingletonList(ifStmt.Statement));
                    depth--;
                    DeleteCondition();
                    depth++;

                    ElseClauseSyntax? elseClause = ifStmt.Else;

                    while (elseClause != null)
                    {
                        if (elseClause.Statement is IfStatementSyntax elseIfStmt)
                        {
                            jsonHandler.addNode(id, "else if", elseIfStmt.Condition.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                            CreateLink("else if");
                            SaveCondition("else if");
                            id++;
                            depth++;
                            AnalyzeStatements(elseIfStmt.Statement is BlockSyntax elseIfBlock
                                ? elseIfBlock.Statements
                                : SyntaxFactory.SingletonList(elseIfStmt.Statement));
                            elseClause = elseIfStmt.Else;
                            depth--;
                            DeleteCondition();
                            depth++;
                        }
                        else
                        {
                            isElse = true;
                            AnalyzeStatements(elseClause.Statement is BlockSyntax elseBlock
                                ? elseBlock.Statements
                                : SyntaxFactory.SingletonList(elseClause.Statement));
                            depth--;
                            DeleteCondition();
                            depth++;
                            isElse = false;
                            break;
                        }
                    }
                    depth = tmp;
                    DeleteCondition();
                }
                else if (statement is ForStatementSyntax forStmt)
                {
                    string forDetails = $"{string.Join(", ", forStmt.Declaration.Variables)};{forStmt.Condition};{forStmt.Incrementors}";
                    jsonHandler.addNode(id, "loop", forDetails, depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("loop");
                    SaveCondition("loop");
                    id++;
                    depth++;
                    AnalyzeStatements(forStmt.Statement is BlockSyntax forBlock
                        ? forBlock.Statements
                        : SyntaxFactory.SingletonList(forStmt.Statement));
                    depth--;
                    DeleteCondition();
                }
                else if (statement is WhileStatementSyntax whileStmt)
                {
                    jsonHandler.addNode(id, "loop", whileStmt.Condition.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("loop");
                    SaveCondition("loop");
                    id++;
                    depth++;
                    AnalyzeStatements(whileStmt.Statement is BlockSyntax forBlock
                        ? forBlock.Statements
                        : SyntaxFactory.SingletonList(whileStmt.Statement));
                    depth--;
                    DeleteCondition();
                }
            }
        }
        static void SaveCondition(string type)
        {
            if (preId.Count - 1 < depth)
            {
                preId.Add(id);
                preType.Add(type);
            }
            else
            {
                preId[depth] = id;
                preType[depth] = type;
            }
        }

        static void DeleteCondition()
        {
            if (preId.Count - 1 > depth)
            {
                for (int i = preId.Count - 1; i > depth; i--)
                {
                    preId.RemoveAt(i);
                    preType.RemoveAt(i);
                }
            }
        }
        static void CreateLink(string type)
        {
            if (id != 0)
            {
                if (preId.Count - 1 == depth)
                {
                    jsonHandler.AddLink(preId[depth], id, "normal");
                }
                else
                {
                    if (preType[depth - 1] == "if" || preType[depth - 1] == "else if")
                    {
                        if (type == "else if" || isElse)
                        {
                            jsonHandler.AddLink(preId[depth - 1], id, "false");
                        }
                        else if (type != "else")
                        {
                            jsonHandler.AddLink(preId[depth - 1], id, "true");
                        }
                    }
                    else if (preType[depth - 1] == "loop")
                    {
                        jsonHandler.AddLink(preId[depth - 1], id, "loop");
                    }
                }
            }
        }

    }
}